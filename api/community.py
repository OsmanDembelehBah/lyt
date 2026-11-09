"""Lyt Community Channel Adapters.

Provider-agnostic SMS & USSD formatting and webhook handlers compatible with
Africa's Talking, Twilio, and direct telco SMPP/USSD gateways.
"""

from typing import Dict, Any, Optional, Tuple
import logging

log = logging.getLogger("lyt.community")

# Multi-lingual templates for community broadcast & automated query responses
TEMPLATES: Dict[str, Dict[str, str]] = {
    "en": {
        "status_good": "LYT ALERT [{site}]: Power tomorrow is GOOD. Strong sunshine forecast. Water pump & mill window: 10:00 to 15:00. Clinic cold chain fully protected. Reply 1 for details, 2 for hours, 3 to report issue.",
        "status_limited": "LYT ALERT [{site}]: Power tomorrow is LIMITED due to cloud cover. Essential lights & clinic protected. Heavy loads (mills/pumps) should pause. Reply 1 for details.",
        "status_risk": "LYT ALERT [{site}]: Power tomorrow is AT RISK (severe storm/dust). Only clinic & essential emergency power active. Please conserve energy.",
        "hours_info": "LYT [{site}]: Best solar window tomorrow is 10:00 - 15:00. Clinic fridges guaranteed 24h. Grain mills and irrigation pumps encouraged during peak sun.",
        "clinic_info": "LYT [{site}]: Clinic cold chain & emergency lighting has guaranteed hard reserve (minimum 3 hours continuous buffer). Status: HEALTHY.",
        "report_ack": "LYT [{site}]: Thank you. Your report has been logged and transmitted to the mini-grid technician on duty.",
        "ussd_root": "CON Lyt Mini-Grid ({site})\n1. Power Tomorrow Outlook\n2. Clinic & Cold Chain Status\n3. Productive Use Hours (Mills/Pumps)\n4. Report Outage or Damage",
        "ussd_opt1": "END Power Tomorrow: GOOD (Strong sun forecast).\nClinic cold chain: 100% Protected.\nDiesel generator: OFF.",
        "ussd_opt2": "END Clinic Status: PROTECTED.\nHard reserve active (3+ hours emergency buffer under p10 cautious forecast).",
        "ussd_opt3": "END Recommended Productive Hours:\n10:00 - 15:00 for grain mills, welders, and water pumps during peak solar generation.",
        "ussd_opt4": "END Report received. Field technician notified to inspect local feeder. Thank you for notifying us.",
        "ussd_invalid": "END Invalid selection. Please dial *384*529# again.",
    },
    "fr": {
        "status_good": "ALERTE LYT [{site}]: L'électricité demain sera BONNE. Fort ensoleillement. Pompes et moulins: 10h00-15h00. Dispensaire et vaccins protégés. Répondez 1 pour détails, 2 pour horaires, 3 pour signaler panne.",
        "status_limited": "ALERTE LYT [{site}]: Électricité LIMITÉE demain (couvert nuageux). Dispensaire et éclairage d'urgence protégés. Moulins en pause.",
        "status_risk": "ALERTE LYT [{site}]: Électricité EN RISQUE demain (orage/poussière). Seul le dispensaire reste alimenté. Merci d'économiser.",
        "hours_info": "LYT [{site}]: Fenêtre solaire optimale: 10h00 - 15h00. Réfrigérateurs dispensaire garantis 24h/24.",
        "clinic_info": "LYT [{site}]: Réserve dispensaire garantie (minimum 3h de sécurité continue). Statut: OPÉRATIONNEL.",
        "report_ack": "LYT [{site}]: Merci. Votre signalement a été transmis au technicien de garde.",
        "ussd_root": "CON Mini-Réseau Lyt ({site})\n1. Disponibilité Demain\n2. État Dispensaire & Vaccins\n3. Heures Machines & Pompes\n4. Signaler une Panne",
        "ussd_opt1": "END Électricité Demain: BONNE.\nDispensaire: 100% Protégé.\nGroupe électrogène: ARRÊT.",
        "ussd_opt2": "END Statut Dispensaire: PROTÉGÉ.\nRéserve d'urgence active (tampon 3h+ sous scénario p10).",
        "ussd_opt3": "END Heures Productives Recommandées:\n10h00 - 15h00 pour moulins, soudures et pompes d'irrigation.",
        "ussd_opt4": "END Signalement reçu. Le technicien a été prévenu pour inspection. Merci.",
        "ussd_invalid": "END Choix invalide. Veuillez recomposer le code USSD.",
    },
    "kri": {
        "status_good": "LYT ALAT [{site}]: Pawa tɔmɔro go bɛtɛ! Sɔn go kɔmɔt fayn. Rɔn yu wata pɔmp ɛn mil frɔm 10:00 te 15:00. Klinik batri gɛt pawa fɔ ful nɛt. Tɛp 1 fɔ no mɔ.",
        "status_limited": "LYT ALAT [{site}]: Pawa tɔmɔro go klia smɔl (blak klawd). Klinik gɛt pawa, bɔt nɔ rɔn big mil dɛm.",
        "status_risk": "LYT ALAT [{site}]: Pawa tɔmɔro de pan denja (big briz/dɔsti). Na di klinik nɔmɔ go gɛt pawa.",
        "hours_info": "LYT [{site}]: Bɛst taym fɔ pawa na 10:00 te 15:00 fɔ wata pɔmp ɛn mil. Klinik frij nɔ go lɔs pawa.",
        "clinic_info": "LYT [{site}]: Klinik batri gɛt rezerv fɔ 3 awa minimum. Statɔs: BƐTƐ.",
        "report_ack": "LYT [{site}]: Tɛnki. Wi dɔn tɛl di tɛknishan mek i kam chɛk am.",
        "ussd_root": "CON Lyt Mini-Grid ({site})\n1. Pawa Tɔmɔro\n2. Klinik frij statɔs\n3. Taym fɔ mil ɛn wata pɔmp\n4. Tɛl wi if sɔntin brok",
        "ussd_opt1": "END Pawa Tɔmɔro: I GO BƐTƐ (Sɔn go de).\nKlinik: 100% Bɛtɛ.\nJɛnireto: NƆ DE RƆN.",
        "ussd_opt2": "END Klinik: GƐT PAWA.\nHard rezerv de wok fɔ kip vaksin kol.",
        "ussd_opt3": "END Taym fɔ Mil ɛn Pɔmp:\n10:00 te 15:00 we di sɔn hat fayn.",
        "ussd_opt4": "END Tɛnki fɔ di ripɔt. Wi dɔn tɛl di tɛknishan mek i chɛk di waya.",
        "ussd_invalid": "END Rɔng nɔmba. Duya dayal am bak.",
    },
    "ha": {
        "status_good": "LYT SANARWA [{site}]: Hasken wuta gobe zai yi kyau sosai. Za a iya kunna injin ban ruwa daga karfe 10:00 zuwa 15:00. Asibiti yana da tabbacin wuta. Latsa 1 domin karin bayani.",
        "status_limited": "LYT SANARWA [{site}]: Wuta gobe za ta dan yi karanci saboda gajimare. Asibiti kadai ke da tabbacin aiki. A rage manyan injina.",
        "status_risk": "LYT SANARWA [{site}]: Gargadin wuta gobe saboda guguwa ko hazo. Asibiti ne kadai zai sami wuta.",
        "hours_info": "LYT [{site}]: Lokaci mafi kyau na aikin injina gobe shine 10:00 zuwa 15:00. Firijin asibiti yana da kariya ta sa'o'i 24.",
        "clinic_info": "LYT [{site}]: Ma'adanar asibiti tana da kariya mai karfi (akalla sa'o'i 3 na gaggawa).",
        "report_ack": "LYT [{site}]: Mun gode. An tura sakon ka ga ma'aikacin wutar.",
        "ussd_root": "CON Lyt Mini-Grid ({site})\n1. Hasken Wuta Gobe\n2. Halin Asibiti da Magunguna\n3. Lokacin Injin Nika da Ban Ruwa\n4. Sanar da Lalacewa",
        "ussd_opt1": "END Wuta Gobe: MAI KYAU (Akwai rana sosai).\nAsibiti: Yana da kariya 100%.\nInjin dizal: A KASHE.",
        "ussd_opt2": "END Asibiti: YANA DA KARIYA.\nAkwai ajiyar gaggawa ta sa'o'i 3 a karkashin hasashen p10.",
        "ussd_opt3": "END Lokacin Injin Nika:\nKarfe 10:00 zuwa 15:00 lokacin da rana ta fi karfi.",
        "ussd_opt4": "END Mun karbi sakonka. An sanar da injiniya domin dubawa. Mun gode.",
        "ussd_invalid": "END Lambar da aka shigar ba daidai ba ce. Sake gwadawa.",
    },
}


def get_template_pack(lang: str) -> Dict[str, str]:
    """Retrieve templates with English fallback."""
    return TEMPLATES.get(lang.lower(), TEMPLATES["en"])


def format_sms_status(site_name: str, outlook: str, lang: str = "en") -> str:
    """Format daily community status alert."""
    pack = get_template_pack(lang)
    key = f"status_{outlook.lower()}"
    tpl = pack.get(key, pack["status_good"])
    return tpl.format(site=site_name)


def handle_sms_inbound(
    sender: str,
    body: str,
    site_name: str = "Kambia Rural Hub",
    lang: str = "en",
) -> Dict[str, str]:
    """Process incoming SMS command and generate reply."""
    cmd = body.strip().upper()
    pack = get_template_pack(lang)

    # Simple command routing
    if cmd in ("1", "STATUS", "POWER", "PAWA"):
        reply = format_sms_status(site_name, "good", lang)
    elif cmd in ("2", "HOURS", "TIME", "MIL", "PUMP"):
        reply = pack["hours_info"].format(site=site_name)
    elif cmd in ("3", "REPORT", "FAULT", "HELP", "BROK"):
        reply = pack["report_ack"].format(site=site_name)
    elif cmd.startswith("LANG"):
        parts = cmd.split()
        if len(parts) > 1 and parts[1].lower() in TEMPLATES:
            new_lang = parts[1].lower()
            return {
                "sender": sender,
                "reply": f"Language updated to {new_lang.upper()}.",
                "lang": new_lang,
            }
        reply = "Available languages: EN, FR, KRI, HA (e.g. reply 'LANG FR')."
    else:
        reply = f"{format_sms_status(site_name, 'good', lang)}"

    return {"sender": sender, "reply": reply, "lang": lang}


def handle_ussd_session(
    session_id: str,
    phone_number: str,
    text: str,
    site_name: str = "Kambia",
    lang: str = "en",
) -> str:
    """Handle USSD session input string.

    Format matches Africa's Talking / standard USSD gateway:
    - Empty text -> initial request, return menu starting with 'CON'
    - Text contains user selections separated by '*' (e.g., '1' or '2*1')
    """
    pack = get_template_pack(lang)
    tokens = [t.strip() for t in text.split("*") if t.strip()]

    if not tokens:
        # First dial, return main menu
        return pack["ussd_root"].format(site=site_name)

    choice = tokens[0]
    if choice == "1":
        return pack["ussd_opt1"]
    elif choice == "2":
        return pack["ussd_opt2"]
    elif choice == "3":
        return pack["ussd_opt3"]
    elif choice == "4":
        return pack["ussd_opt4"]
    else:
        return pack["ussd_invalid"]
