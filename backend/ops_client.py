"""
EPO OPS (Open Patent Services) client.

Handles OAuth2 client-credentials auth, bibliographic data retrieval,
INPADOC family lookup, and English-abstract fallback.

When OPS_CONSUMER_KEY and OPS_CONSUMER_SECRET are set in the environment,
this module makes real calls to ops.epo.org. Otherwise it returns mock
data that mirrors the real response structure exactly, so the rest of
the app needs zero changes when credentials are added or removed.
"""

import os
import time
import base64
import json
import requests

OPS_BASE = "https://ops.epo.org/3.2/rest-services"
OPS_AUTH = "https://ops.epo.org/3.2/auth/accesstoken"


class OPSClient:
    def __init__(self):
        self.consumer_key = os.environ.get("OPS_CONSUMER_KEY")
        self.consumer_secret = os.environ.get("OPS_CONSUMER_SECRET")
        self.access_token = None
        self.token_expires_at = 0
        self.live_mode = bool(self.consumer_key and self.consumer_secret)

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def _authenticate(self):
        """OAuth2 client-credentials flow. Token is valid 20 minutes.
        Cached in-process; refreshed 30s before expiry."""
        if self.access_token and time.time() < self.token_expires_at - 30:
            return self.access_token

        creds = f"{self.consumer_key}:{self.consumer_secret}"
        encoded = base64.b64encode(creds.encode()).decode()
        headers = {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        resp = requests.post(
            OPS_AUTH, headers=headers, data="grant_type=client_credentials", timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        self.access_token = data["access_token"]
        self.token_expires_at = time.time() + int(data.get("expires_in", 1200))
        return self.access_token

    def _call(self, path: str, accept: str = "application/json") -> dict:
        token = self._authenticate()
        headers = {"Authorization": f"Bearer {token}", "Accept": accept}
        resp = requests.get(f"{OPS_BASE}{path}", headers=headers, timeout=15)
        resp.raise_for_status()
        if accept == "application/json":
            return resp.json()
        return {"raw": resp.content}

    # ------------------------------------------------------------------
    # Reference normalization
    # ------------------------------------------------------------------

    def normalize_number(self, user_input: str) -> tuple:
        """Parse user input like 'JP2009-207252' or 'JP 2009 207252 A'
        into (country, number) tuple usable by OPS docdb format."""
        s = user_input.strip().upper().replace(" ", "").replace("-", "").replace(",", "")
        country = ""
        for i, ch in enumerate(s):
            if ch.isdigit():
                country = s[:i]
                number = s[i:]
                # Strip trailing kind code (A, A1, B1, B2, etc.)
                for j in range(len(number) - 1, -1, -1):
                    if number[j].isdigit():
                        number = number[: j + 1]
                        break
                return country, number
        return "", s

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_bibliographic(self, user_input: str) -> dict:
        """Main entry point. Returns a flat normalized record."""
        country, number = self.normalize_number(user_input)
        if self.live_mode:
            try:
                return self._get_bibliographic_live(country, number)
            except Exception as e:
                return {"error": str(e), "country": country, "number": number}
        return self._get_bibliographic_mock(country, number)

    def get_family(self, user_input: str) -> list:
        """Get the INPADOC family — 'also published as' equivalents."""
        country, number = self.normalize_number(user_input)
        if self.live_mode:
            try:
                return self._get_family_live(country, number)
            except Exception as e:
                return [{"error": str(e)}]
        return self._get_family_mock(country, number)

    # ------------------------------------------------------------------
    # Live calls
    # ------------------------------------------------------------------

    def _get_bibliographic_live(self, country: str, number: str) -> dict:
        path = f"/published-data/publication/docdb/{country}.{number}/biblio"
        raw = self._call(path)
        result = self._parse_biblio_response(raw, country, number)

        # The /biblio endpoint doesn't reliably include the abstract.
        # If we got bibliographic data but no abstract, hit /abstract
        # separately. Extra API call but reliably gives us the English
        # abstract for any reference a user might test.
        if "error" not in result and not result.get("abstract_available"):
            try:
                abstract_text = self._get_abstract_live(country, number)
                if abstract_text:
                    result["abstract_en"] = abstract_text
                    result["abstract_available"] = True
            except Exception:
                # Abstract endpoint failed (no English abstract published,
                # rate limit, etc). Leave biblio intact; UI handles
                # empty abstracts gracefully.
                pass

        return result

    def _get_abstract_live(self, country: str, number: str) -> str:
        """Fetch just the English abstract.

        Returns the abstract text, or empty string if none in English.
        Only called as a fallback when /biblio didn't include one.
        """
        path = f"/published-data/publication/docdb/{country}.{number}/abstract"
        raw = self._call(path)
        try:
            doc = raw["ops:world-patent-data"]["exchange-documents"]["exchange-document"]
            if isinstance(doc, list):
                doc = doc[0]
            abstracts = doc.get("abstract", [])
            if isinstance(abstracts, dict):
                abstracts = [abstracts]
            for ab in abstracts:
                # Only return English abstracts. JP/CN/DE abstracts exist
                # in the data but aren't useful for USPTO IDS.
                if ab.get("@lang") == "en":
                    ps = ab.get("p", {})
                    if isinstance(ps, dict):
                        ps = [ps]
                    return " ".join(p.get("$", "") for p in ps).strip()
        except (KeyError, TypeError):
            pass
        return ""

    def _parse_biblio_response(self, raw: dict, country: str, number: str) -> dict:
        """Parse OPS biblio response. OPS returns a deeply nested 'exchange'
        structure; this flattens it into the shape the rest of the app expects.
        """
        try:
            doc = raw["ops:world-patent-data"]["exchange-documents"]["exchange-document"]
            if isinstance(doc, list):
                doc = doc[0]
            biblio = doc["bibliographic-data"]

            title = ""
            titles = biblio.get("invention-title", [])
            if isinstance(titles, dict):
                titles = [titles]
            for t in titles:
                if t.get("@lang") == "en":
                    title = t.get("$", "")
                    break
            if not title and titles:
                title = titles[0].get("$", "")

            applicants = []
            apps = biblio.get("parties", {}).get("applicants", {}).get("applicant", [])
            if isinstance(apps, dict):
                apps = [apps]
            for a in apps:
                name = a.get("applicant-name", {}).get("name", {}).get("$")
                if name and name not in applicants:
                    applicants.append(name)

            inventors = []
            invs = biblio.get("parties", {}).get("inventors", {}).get("inventor", [])
            if isinstance(invs, dict):
                invs = [invs]
            for i in invs:
                name = i.get("inventor-name", {}).get("name", {}).get("$")
                if name and name not in inventors:
                    inventors.append(name)

            pub_refs = biblio.get("publication-reference", {}).get("document-id", [])
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            pub_date = ""
            for p in pub_refs:
                d = p.get("date", {}).get("$")
                if d:
                    pub_date = d
                    break

            app_refs = biblio.get("application-reference", {}).get("document-id", [])
            if isinstance(app_refs, dict):
                app_refs = [app_refs]
            app_number = ""
            filing_date = ""
            for a in app_refs:
                if a.get("@document-id-type") == "docdb":
                    app_number = a.get("doc-number", {}).get("$", "")
                    filing_date = a.get("date", {}).get("$", "")
                    break

            priority_claims = []
            pcs = biblio.get("priority-claims", {}).get("priority-claim", [])
            if isinstance(pcs, dict):
                pcs = [pcs]
            for pc in pcs:
                docs = pc.get("document-id", [])
                if isinstance(docs, dict):
                    docs = [docs]
                for d in docs:
                    if d.get("@document-id-type") == "epodoc":
                        priority_claims.append(
                            {
                                "country": d.get("country", {}).get("$", ""),
                                "number": d.get("doc-number", {}).get("$", ""),
                                "date": d.get("date", {}).get("$", ""),
                            }
                        )

            abstract_text = ""
            abstracts = doc.get("abstract", [])
            if isinstance(abstracts, dict):
                abstracts = [abstracts]
            for ab in abstracts:
                if ab.get("@lang") == "en":
                    ps = ab.get("p", {})
                    if isinstance(ps, dict):
                        ps = [ps]
                    abstract_text = " ".join(p.get("$", "") for p in ps)
                    break

            return {
                "source": "EPO OPS (live)",
                "country": country,
                "number": number,
                "title": title,
                "publication_date": pub_date,
                "application_number": app_number,
                "filing_date": filing_date,
                "applicants": applicants,
                "inventors": inventors,
                "priority_claims": priority_claims,
                "abstract_en": abstract_text,
                "abstract_available": bool(abstract_text),
            }
        except (KeyError, TypeError) as e:
            return {"error": f"Could not parse OPS response: {e}"}

    def _get_family_live(self, country: str, number: str) -> list:
        path = f"/family/publication/docdb/{country}.{number}"
        raw = self._call(path)
        try:
            members = raw["ops:world-patent-data"]["ops:patent-family"]["ops:family-member"]
            if isinstance(members, dict):
                members = [members]
            results = []
            for m in members:
                pub = m.get("publication-reference", {}).get("document-id", [])
                if isinstance(pub, dict):
                    pub = [pub]
                for p in pub:
                    if p.get("@document-id-type") == "docdb":
                        results.append(
                            {
                                "country": p.get("country", {}).get("$", ""),
                                "number": p.get("doc-number", {}).get("$", ""),
                                "kind": p.get("kind", {}).get("$", ""),
                                "date": p.get("date", {}).get("$", ""),
                            }
                        )
            seen = set()
            unique = []
            for r in results:
                key = (r["country"], r["number"])
                if key not in seen:
                    seen.add(key)
                    unique.append(r)
            return unique
        except (KeyError, TypeError) as e:
            return [{"error": f"Could not parse family: {e}"}]

    # ------------------------------------------------------------------
    # Mock data — structured identically to the live response so swapping
    # in live mode requires zero changes anywhere downstream.
    # ------------------------------------------------------------------

    def _get_bibliographic_mock(self, country: str, number: str) -> dict:
        # Generic Japanese reference (was a real Panasonic case before the
        # client-name strip; switched to a generic invented applicant so
        # the demo data doesn't accidentally name a real-world filer).
        if country == "JP" and number.startswith("2009207252"):
            return {
                "source": "MOCK (no OPS credentials)",
                "country": "JP",
                "number": "2009207252",
                "title": "SEMICONDUCTOR DEVICE AND METHOD OF MANUFACTURING THE SAME",
                "publication_date": "20090910",
                "application_number": "2008048572",
                "filing_date": "20080228",
                "applicants": ["JAPANESE APPLICANT INC"],
                "inventors": ["TANAKA HIROSHI", "YAMAMOTO KENICHI"],
                "priority_claims": [
                    {"country": "JP", "number": "2008048572", "date": "20080228"}
                ],
                "abstract_en": (
                    "PROBLEM TO BE SOLVED: To provide a semiconductor device capable "
                    "of reducing parasitic capacitance and a method of manufacturing "
                    "the same. SOLUTION: The semiconductor device includes a "
                    "substrate, a gate electrode formed on the substrate, and source "
                    "and drain regions formed in the substrate on both sides of the "
                    "gate electrode."
                ),
                "abstract_available": True,
            }
        # Generic country-keyed mocks. Keep the applicant names neutral and
        # fictional — they should not match any real company.
        mocks = {
            "US": {
                "title": "METHOD AND APPARATUS FOR DATA PROCESSING",
                "applicants": ["GENERIC TECHNOLOGY CORP"],
                "inventors": ["SMITH JOHN", "JONES MARY"],
            },
            "EP": {
                "title": "WIRELESS COMMUNICATION SYSTEM",
                "applicants": ["EUROPEAN APPLICANT AG"],
                "inventors": ["VIRTANEN LAURI"],
            },
            "CN": {
                "title": "BATTERY MANAGEMENT CIRCUIT",
                "applicants": ["CHINESE APPLICANT CO LTD"],
                "inventors": ["LI WEI", "ZHANG MIN"],
            },
        }
        m = mocks.get(
            country,
            {
                "title": "SAMPLE PATENT DOCUMENT",
                "applicants": ["APPLICANT NAME"],
                "inventors": ["INVENTOR NAME"],
            },
        )
        return {
            "source": "MOCK (no OPS credentials)",
            "country": country,
            "number": number,
            "title": m["title"],
            "publication_date": "20200115",
            "application_number": f"{number[:4]}000000",
            "filing_date": "20190601",
            "applicants": m["applicants"],
            "inventors": m["inventors"],
            "priority_claims": [
                {"country": country, "number": f"{number[:4]}000000", "date": "20190601"}
            ],
            "abstract_en": (
                f"Mock abstract for {country}{number}. With OPS credentials "
                "this is replaced by the real abstract pulled from EPO."
            ),
            "abstract_available": True,
        }

    def _get_family_mock(self, country: str, number: str) -> list:
        if country == "JP" and number.startswith("2009207252"):
            return [
                {"country": "JP", "number": "2009207252", "kind": "A", "date": "20090910"},
                {"country": "US", "number": "8124474", "kind": "B2", "date": "20120228"},
                {"country": "US", "number": "20090218633", "kind": "A1", "date": "20090903"},
                {"country": "CN", "number": "101521173", "kind": "A", "date": "20090902"},
            ]
        return [
            {"country": country, "number": number, "kind": "A", "date": "20200115"},
            {"country": "US", "number": "10999999", "kind": "B2", "date": "20210601"},
            {"country": "EP", "number": "3999999", "kind": "A1", "date": "20200815"},
        ]


if __name__ == "__main__":
    client = OPSClient()
    print(f"Live mode: {client.live_mode}")
    print(f"Credentials loaded: key={bool(client.consumer_key)}, secret={bool(client.consumer_secret)}")
    print()
    print("--- Bibliographic test ---")
    print(json.dumps(client.get_bibliographic("JP2009-207252"), indent=2))
    print()
    print("--- Family test ---")
    print(json.dumps(client.get_family("JP2009-207252"), indent=2))
