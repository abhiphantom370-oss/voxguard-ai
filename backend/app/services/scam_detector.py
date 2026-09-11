import re
import logging
from typing import Dict, List, Any, Tuple, Optional

logger = logging.getLogger("voxguard.scam")

# Negation and safety warning markers in English and Hindi/Hinglish
NEGATION_PATTERNS = [
    r"\bnever\b",
    r"\bdo\s+not\b",
    r"\bdon'?t\b",
    r"\bshould\s+not\b",
    r"\bshouldn'?t\b",
    r"\bmust\s+not\b",
    r"\bbeware\s*(?:of)?\b",
    r"\bcaution\b",
    r"\bfraud\s+alert\b",
    r"\bwarning\b",
    r"\bnot\s+(?:supposed\s+to|allowed\s+to)\b",
    r"\bnever\s+share\b",
    r"\bdo\s+not\s+share\b",
    r"\bdon'?t\s+share\b",
    r"\bkabhi\s+(?:bhi\s+)?mat\b",
    r"\bmat\s+(?:batao|dena|bhejo|karo|share\s+karo)\b",
    r"\bshare\s+mat\s+karna\b",
    r"\bpolice\s+(?:does\s+not|never)\s+(?:call|ask)\b",
    r"\bbank\s+(?:never|does\s+not)\s+asks?\b"
]

CATEGORY_PATTERNS: Dict[str, Dict[str, Any]] = {
    "OTP_REQUEST": {
        "weight": 40,
        "human_reason": "OTP request detected",
        "patterns": [
            r"\b(?:tell|give|share|send|enter|read|provide|need)\s+(?:me\s+)?(?:the\s+|your\s+)?(?:[a-z]+\s+)?(?:one\s+time\s+password|otp|verification\s+code|security\s+code|sms\s+code)\b",
            r"\b(?:otp|one\s+time\s+password|verification\s+code|security\s+code)\s+(?:batao|bhejo|do|share\s+karo|bataiye|send\s+karo)\b",
            r"\b(?:need|require)\s+your\s+(?:otp|verification\s+code|one\s+time\s+password)\b",
            r"\b(?:otp|verification\s+code|code)\s+(?:that\s+)?(?:you\s+)?(?:have\s+)?(?:received|got)\b",
            r"\b(?:received\s+on\s+your\s+mobile|sent\s+to\s+your\s+phone)\b",
            r"\botp\s+number\b",
            r"\bwhats?app\s+otp\b",
            r"\bsend\s+(?:your\s+)?otp\b",
            r"\bshare\s+(?:the\s+|your\s+)?otp\b",
            r"\b(?:one\s+time\s+password|otp)\s+bata\s+dijiye\b"
        ]
    },
    "CREDENTIAL_REQUEST": {
        "weight": 35,
        "human_reason": "Financial credential request",
        "patterns": [
            r"\b(?:tell|give|share|enter|provide)\s+(?:me\s+)?(?:your\s+)?(?:[a-z]+\s+)*(?:password|pin|mpin|login\s+details|login\s+id|credentials|cvv)\b",
            r"\b(?:bank\s+|login\s+)?credentials\b",
            r"\b(?:pin|mpin|password|login\s+details)\s+(?:batao|bhejo|do|share\s+karo)\b",
            r"\bpassword\s+reset\s+(?:link|request|code)\b",
            r"\bcvv\s+(?:number|code)?\b",
            r"\bcvv\s+(?:batao|bhejo)\b",
            r"\b(?:upi\s+pin|atm\s+pin)\b"
        ]
    },
    "FINANCIAL_REQUEST": {
        "weight": 30,
        "human_reason": "Payment demand detected",
        "patterns": [
            r"\b(?:transfer|send|deposit|pay|wire)\s+(?:the\s+)?(?:money|cash|amount|funds|payment|rupees|dollars|rs)\b",
            r"\b(?:paise|rupaye|amount|payment)\s+(?:transfer\s+karo|bhejo|dalwao|karo|send\s+karo)\b",
            r"\b(?:urgent|immediate)\s+payment\b",
            r"\btransfer\s+(?:immediately|right\s+now|urgently)\b",
            r"\badvance\s+payment\b",
            r"\bscan\s+(?:the\s+|this\s+)?(?:qr\s+code|qr)\b",
            r"\bqr\s+code\s+scan\s+karo\b",
            r"\bupi\s+(?:transfer|payment)\b",
            r"\bmake\s+(?:the\s+)?payment\b"
        ]
    },
    "UPI_REQUEST": {
        "weight": 35,
        "human_reason": "UPI PIN extraction pattern",
        "patterns": [
            r"\bupi\s+pin\b",
            r"\b(?:upi\s+pin)\s+(?:enter\s+karo|batao|daalo)\b",
            r"\b(?:google\s+pay|gpay|phonepe|phone\s+pe|paytm)\s+(?:karo|pe\s+bhejo|pe\s+transfer\s+karo)\b",
            r"\benter\s+(?:your\s+)?upi\s+pin\s+to\s+receive\b"
        ]
    },
    "CARD_DETAILS_REQUEST": {
        "weight": 35,
        "human_reason": "Payment card details extraction detected",
        "patterns": [
            r"\b(?:debit|credit|atm)\s+card\s+(?:number|details|expiry|cvv)\b",
            r"\bcard\s+(?:number|details)\s+(?:batao|bhejo|share\s+karo)\b",
            r"\b16\s+digit\s+(?:card\s+)?number\b",
            r"\bcard\s+expiry\s+date\b",
            r"\bcredit\s+card\b",
            r"\bdebit\s+card\b",
            r"\batm\s+card\b"
        ]
    },
    "BANK_IMPERSONATION": {
        "weight": 25,
        "human_reason": "Bank impersonation pattern",
        "patterns": [
            r"\bcalling\s+from\s+(?:your\s+)?(?:bank|sbi|hdfc|icici|axis|rbi|reserve\s+bank|customer\s+care)\b",
            r"\bbank\s+(?:manager|officer|headquarters|customer\s+care|account|official)\b",
            r"\bcustomer\s+care\s+(?:officer|executive|department|representative)\b",
            r"\bmain\s+bank\s+se\s+bol\s+raha\s+hoon\b",
            r"\bverify\s+(?:your\s+)?(?:bank\s+)?account\b",
            r"\bbank\s+account\b"
        ]
    },
    "ACCOUNT_SUSPENSION_THREAT": {
        "weight": 25,
        "human_reason": "Account suspension threat detected",
        "patterns": [
            r"\b(?:bank\s+)?account\s+(?:will\s+be\s+|is\s+)?(?:blocked|suspended|deactivated|frozen|hold)\b",
            r"\baccount\s+block\s+ho\s+(?:jayega|gaya)\b",
            r"\b(?:card|service|sim)\s+(?:blocked|suspended|deactivated)\b",
            r"\baccount\s+blocked\b",
            r"\baccount\s+suspended\b"
        ]
    },
    "URGENCY_PRESSURE": {
        "weight": 20,
        "human_reason": "Urgency language detected",
        "patterns": [
            r"\b(?:immediately|right\s+now|without\s+delay|urgently|hurry\s+up|at\s+once)\b",
            r"\bwithin\s+(?:5|five|10|ten|15|30)\s+minutes\b",
            r"\bjaldi\s+(?:karo|bhejo|payment\s+karo|batao)\b",
            r"\btime\s+is\s+running\s+out\b",
            r"\blast\s+warning\b",
            r"\bimmediate\s+action\s+required\b",
            r"\burgent\b"
        ]
    },
    "REMOTE_ACCESS_REQUEST": {
        "weight": 35,
        "human_reason": "Remote access request",
        "patterns": [
            r"\b(?:anydesk|teamviewer|rustdesk|quicksupport|ultraviewer)\b",
            r"\b(?:share|stream)\s+your\s+screen\b",
            r"\bscreen\s+share\s+karo\b",
            r"\bremote\s+access\b",
            r"\bscreen\s+share\b"
        ]
    },
    "UNVERIFIED_APP_OR_LINK": {
        "weight": 20,
        "human_reason": "Suspicious app download or link request detected",
        "patterns": [
            r"\b(?:install|download)\s+(?:this\s+|the\s+)?(?:app|apk|software|tool|application)\b",
            r"\b(?:click|open|tap)\s+(?:on\s+)?(?:this\s+|the\s+)?link\b",
            r"\blink\s+(?:kholo|pe\s+click\s+karo|bhej\s+raha\s+hoon)\b",
            r"\binstall\s+app\b",
            r"\bclick\s+link\b",
            r"\bbit\.ly|tinyurl|t\.me|\.xyz|\.top|\.ru\b"
        ]
    },
    "IDENTITY_DOCUMENT_REQUEST": {
        "weight": 25,
        "human_reason": "Suspicious identity verification / KYC solicitation detected",
        "patterns": [
            r"\b(?:aadhaar|pan\s+card|passport|voter\s+id)\s+(?:number|copy|photo)\b",
            r"\b(?:aadhaar|pan)\s+(?:number\s+)?(?:batao|bhejo|share\s+karo)\b",
            r"\bkyc\s+(?:update|verification|expired|complete|pending)\b",
            r"\bkyc\s+(?:complete|update)\s+karo\b",
            r"\bkyc\b",
            r"\bpan\s+card\b",
            r"\baadhaar\b"
        ]
    },
    "LEGAL_THREAT_COERCION": {
        "weight": 35,
        "human_reason": "Law enforcement intimidation / digital arrest pattern detected",
        "patterns": [
            r"\b(?:police|cbi|customs|cyber\s+crime|ed|enforcement\s+directorate|narcotics)\b",
            r"\bdigital\s+arrest\b",
            r"\barrest\s+warrant\b",
            r"\blegal\s+action\b",
            r"\b(?:parcel|courier)\s+(?:seized|illegal|customs|drugs|detained)\b",
            r"\bcourt\s+order\b",
            r"\bfir\s+registered\b",
            r"\bcourier\b",
            r"\bparcel\b"
        ]
    },
    "REWARD_REFUND_BAIT": {
        "weight": 25,
        "human_reason": "Prize, loan, or refund bait detected",
        "patterns": [
            r"\b(?:process|claim|get|receive|issue|approved)\s+(?:your\s+)?(?:refund|cashback|reward|lottery|prize|loan|investment)\b",
            r"\b(?:refund|cashback|reward|lottery|prize|investment|loan)\b",
            r"\blottery\s+lagi\s+hai\b",
            r"\bclaim\s+refund\b"
        ]
    }
}

class ScamIntentDetector:
    """
    Deterministic rule and context-based Scam Intent Engine operating on transcript text.
    Implements 12 cybersecurity fraud categories, English + Hinglish phrase matching,
    negation/educational filtering, and calibrated 0-100 severity scoring.
    """

    @classmethod
    def get_category_tier(cls, score: float) -> str:
        """
        Maps a 0-100 score to the standardized categories:
        0–24 = LOW
        25–49 = CAUTION
        50–74 = HIGH
        75–100 = CRITICAL
        """
        if score >= 75.0:
            return "CRITICAL"
        elif score >= 50.0:
            return "HIGH"
        elif score >= 25.0:
            return "CAUTION"
        else:
            return "LOW"

    @classmethod
    def is_negated_or_educational(cls, text: str, phrase_start: int, phrase_end: int) -> bool:
        """
        Checks if the matched phrase is preceded or contextualized by a safety/negation marker.
        E.g., 'Never share your OTP with anyone' vs 'Tell me your OTP now'.
        """
        # Look at window 70 characters before the phrase
        prefix_window = text[max(0, phrase_start - 70):phrase_start].lower()
        for neg in NEGATION_PATTERNS:
            if re.search(neg, prefix_window):
                return True

        # Look at window 50 characters after the phrase (e.g., 'OTP share mat karna' or 'OTP with anyone')
        suffix_window = text[phrase_end:min(len(text), phrase_end + 50)].lower()
        for neg in [
            r"\bmat\s+(?:karna|karo|batao|dena)\b",
            r"\bkabhi\s+mat\b",
            r"\bko\s+kisi\s+se\s+share\s+mat\b",
            r"\bwith\s+anyone\b"
        ]:
            if re.search(neg, suffix_window):
                # If followed by 'with anyone', confirm prefix had a safety/negative hint or contains 'never'
                if "with anyone" in suffix_window:
                    full_window = text[max(0, phrase_start - 30):min(len(text), phrase_end + 30)].lower()
                    if any(w in full_window for w in ["never", "don't", "do not", "not", "shouldn't", "beware"]):
                        return True
                else:
                    return True

        return False

    @classmethod
    def analyze(cls, transcript: str) -> Dict[str, Any]:
        """
        Performs contextual scan on transcript text.
        Returns:
          scamIntentScore: float [0.0 to 100.0]
          scamCategory: str ["LOW", "CAUTION", "HIGH", "CRITICAL"]
          detectedIntents: List[str]
          suspiciousPhrases: List[Dict[str, str]]
          explanation: List[str]
          isCriticalWarning: bool
          criticalWarningMessage: Optional[str]
        """
        if not transcript or not transcript.strip():
            return {
                "scamIntentScore": 0.0,
                "scamCategory": "LOW",
                "detectedIntents": [],
                "suspiciousPhrases": [],
                "explanation": ["No audible speech or transcript text available for lexical intent analysis."],
                "isCriticalWarning": False,
                "criticalWarningMessage": None
            }

        text = transcript.strip()
        text_lower = text.lower()
        # ASR acronym, punctuation, and hyphen normalization
        text_clean = re.sub(r'[-\.]', ' ', text_lower)
        text_clean = re.sub(r'\s+', ' ', text_clean).strip()
        text_clean = re.sub(r'\bup\s*i(?:\s*|\b)pin\b', 'upi pin', text_clean)
        text_clean = re.sub(r'\bo\s*t\s*p\b', 'otp', text_clean)
        text_clean = re.sub(r'\bc\s*v\s*v\b', 'cvv', text_clean)

        detected_intents: List[str] = []
        suspicious_phrases: List[Dict[str, str]] = []
        category_hits: Dict[str, int] = {}
        explanations: List[str] = []

        total_weight = 0

        raw_matches = []
        for cat_name, cat_meta in CATEGORY_PATTERNS.items():
            for pat in cat_meta["patterns"]:
                # Match against both raw lower text and normalized clean text
                for t_search, orig_str in [(text_lower, text), (text_clean, text)]:
                    for match in re.finditer(pat, t_search):
                        start, end = match.span()
                        if cls.is_negated_or_educational(t_search, start, end):
                            logger.info(f"[ScamDetector] Ignored negated/educational phrase: '{t_search[start:end]}'")
                            continue
                        matched_snippet = orig_str[start:end] if end <= len(orig_str) else t_search[start:end]
                        raw_matches.append({
                            "start": start,
                            "end": end,
                            "phrase": matched_snippet,
                            "category": cat_name,
                            "weight": cat_meta["weight"]
                        })

        # Sort raw matches by length descending so longer phrases take precedence
        raw_matches.sort(key=lambda m: (m["end"] - m["start"]), reverse=True)
        selected_spans = []

        for m in raw_matches:
            is_subspan = any(
                (s["start"] <= m["start"] and s["end"] >= m["end"] and s["category"] == m["category"]) for s in selected_spans
            )
            if not is_subspan:
                selected_spans.append(m)
                if not any(p["phrase"].lower() == m["phrase"].lower() for p in suspicious_phrases):
                    suspicious_phrases.append({
                        "phrase": m["phrase"],
                        "category": m["category"]
                    })
                if m["category"] not in detected_intents:
                    detected_intents.append(m["category"])
                    category_hits[m["category"]] = m["weight"]
                    total_weight += m["weight"]

        # Contextual synergy multipliers:
        synergy_bonus = 0.0

        # OTP / Credential + Urgency
        if ("OTP_REQUEST" in detected_intents or "CREDENTIAL_REQUEST" in detected_intents or "UPI_REQUEST" in detected_intents) and "URGENCY_PRESSURE" in detected_intents:
            synergy_bonus += 15.0
            explanations.append("High-severity combination: Urgent demand coupled with credential/OTP extraction.")

        # Bank Impersonation + OTP / Credentials / Account Threat
        if "BANK_IMPERSONATION" in detected_intents and (
            "OTP_REQUEST" in detected_intents or
            "CREDENTIAL_REQUEST" in detected_intents or
            "UPI_REQUEST" in detected_intents or
            "ACCOUNT_SUSPENSION_THREAT" in detected_intents
        ):
            synergy_bonus += 20.0
            explanations.append("Classic bank fraud pattern: Financial institution impersonation to extract security credentials.")

        # Remote Access + Refund / App install
        if "REMOTE_ACCESS_REQUEST" in detected_intents:
            if "REWARD_REFUND_BAIT" in detected_intents or "UNVERIFIED_APP_OR_LINK" in detected_intents:
                synergy_bonus += 15.0
                explanations.append("High-severity combination: Remote desktop access solicited under the guise of refund or support processing.")
            else:
                synergy_bonus += 10.0
                explanations.append("Remote desktop access solicited (AnyDesk/TeamViewer), presenting critical device takeover hazard.")

        # Law enforcement / Digital arrest + Payment / Urgency
        if "LEGAL_THREAT_COERCION" in detected_intents:
            if "FINANCIAL_REQUEST" in detected_intents or "URGENCY_PRESSURE" in detected_intents:
                synergy_bonus += 20.0
                explanations.append("High-severity combination: Digital arrest / law enforcement intimidation coupled with financial demand.")
            else:
                synergy_bonus += 15.0
                explanations.append("Intimidation tactics detected (Digital Arrest / Law Enforcement threat coercion).")

        # Account Suspension + OTP
        if "ACCOUNT_SUSPENSION_THREAT" in detected_intents and ("OTP_REQUEST" in detected_intents or "UPI_REQUEST" in detected_intents) and "BANK_IMPERSONATION" not in detected_intents:
            synergy_bonus += 15.0
            explanations.append("Account suspension intimidation used to extract verification credentials.")

        # Generate category-specific explainable reasons
        for cat in detected_intents:
            reason = CATEGORY_PATTERNS[cat]["human_reason"]
            if reason not in explanations:
                explanations.append(reason)

        # Compute deterministic score bounded 0 - 100
        raw_score = float(total_weight) + synergy_bonus
        scam_intent_score = round(min(100.0, max(0.0, raw_score)), 1)
        scam_category = cls.get_category_tier(scam_intent_score)

        if not detected_intents:
            explanations.append("No suspicious scam keywords or deceptive conversational patterns detected.")

        # Critical alert flag for Live Detection
        critical_intents = {"OTP_REQUEST", "CREDENTIAL_REQUEST", "CARD_DETAILS_REQUEST", "UPI_REQUEST", "REMOTE_ACCESS_REQUEST"}
        has_critical = any(ci in detected_intents for ci in critical_intents) or (scam_intent_score >= 75.0)

        critical_msg = None
        if has_critical:
            flagged = [CATEGORY_PATTERNS[ci]["human_reason"] for ci in detected_intents if ci in critical_intents]
            detail = flagged[0] if flagged else "Critical social-engineering cues"
            critical_msg = f"CRITICAL SECURITY ALERT: {detail} in conversational stream!"

        # Extract structured sensitive request indicators
        otp_detected = ("OTP_REQUEST" in detected_intents) or bool(re.search(r"\b(?:otp|one\s*time\s*password)\b", text_clean))
        pin_detected = ("UPI_REQUEST" in detected_intents) or bool(re.search(r"\b(?:pin|mpin|atm\s*pin|upi\s*pin)\b", text_clean))
        cvv_detected = bool(re.search(r"\bcvv\b", text_clean))
        upi_pin_detected = ("UPI_REQUEST" in detected_intents) or bool(re.search(r"\bupi\s*pin\b", text_clean))
        password_detected = bool(re.search(r"\bpassword\b", text_clean))
        payment_transfer_detected = ("FINANCIAL_REQUEST" in detected_intents) or bool(re.search(r"\b(?:transfer|send\s*money|pay|deposit|funds)\b", text_clean))
        impersonation_detected = bool({"BANK_IMPERSONATION", "LEGAL_THREAT_COERCION"}.intersection(detected_intents))
        urgency_detected = ("URGENCY_PRESSURE" in detected_intents) or bool(re.search(r"\b(?:immediately|urgently|right\s*now|hurry)\b", text_clean))
        sensitive_request = bool(
            otp_detected or pin_detected or cvv_detected or upi_pin_detected or
            password_detected or payment_transfer_detected or impersonation_detected or has_critical
        )

        sensitive_indicators = {
            "otp_detected": otp_detected,
            "pin_detected": pin_detected,
            "cvv_detected": cvv_detected,
            "upi_pin_detected": upi_pin_detected,
            "password_detected": password_detected,
            "payment_transfer_detected": payment_transfer_detected,
            "impersonation_detected": impersonation_detected,
            "urgency_detected": urgency_detected,
            "sensitive_request": sensitive_request
        }

        return {
            "scamIntentScore": scam_intent_score,
            "scamCategory": scam_category,
            "detectedIntents": detected_intents,
            "suspiciousPhrases": suspicious_phrases,
            "explanation": explanations,
            "isCriticalWarning": has_critical,
            "criticalWarningMessage": critical_msg,
            "sensitive_indicators": sensitive_indicators,
            "sensitiveIndicators": sensitive_indicators
        }


scam_detector = ScamIntentDetector()
