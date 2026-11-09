import pytest
from community import handle_sms_inbound, handle_ussd_session, format_sms_status, TEMPLATES

def test_template_coverage():
    for lang in ("en", "fr", "kri", "ha"):
        assert lang in TEMPLATES
        assert "status_good" in TEMPLATES[lang]
        assert "ussd_root" in TEMPLATES[lang]

def test_sms_status_formatting():
    msg = format_sms_status("Kabala", "good", "en")
    assert "Kabala" in msg
    assert "GOOD" in msg

    msg_fr = format_sms_status("Sikasso", "limited", "fr")
    assert "Sikasso" in msg_fr
    assert "LIMITÉE" in msg_fr

def test_sms_command_routing():
    # Query 1 / Status
    res = handle_sms_inbound("+23276123456", "1", site_name="Kabala", lang="en")
    assert "GOOD" in res["reply"]
    assert "Kabala" in res["reply"]

    # Query 2 / Hours
    res2 = handle_sms_inbound("+23276123456", "2", site_name="Kabala", lang="en")
    assert "10:00 - 15:00" in res2["reply"]

    # Query 3 / Report
    res3 = handle_sms_inbound("+23276123456", "3", site_name="Kabala", lang="en")
    assert "logged" in res3["reply"].lower()

    # Change language
    res4 = handle_sms_inbound("+23276123456", "LANG FR", site_name="Kabala", lang="en")
    assert res4["lang"] == "fr"

def test_ussd_session_flow():
    # Initial dial (empty text) -> returns menu starting with CON
    resp_init = handle_ussd_session("sess-1", "+23276123456", "", site_name="Kabala", lang="en")
    assert resp_init.startswith("CON")
    assert "1. Power Tomorrow" in resp_init

    # Option 1 -> Power tomorrow outlook
    resp_opt1 = handle_ussd_session("sess-1", "+23276123456", "1", site_name="Kabala", lang="en")
    assert resp_opt1.startswith("END")
    assert "Power Tomorrow: GOOD" in resp_opt1

    # Option 2 -> Clinic & cold chain
    resp_opt2 = handle_ussd_session("sess-1", "+23276123456", "2", site_name="Kabala", lang="en")
    assert resp_opt2.startswith("END")
    assert "Clinic Status: PROTECTED" in resp_opt2

    # Option 4 -> Report fault
    resp_opt4 = handle_ussd_session("sess-1", "+23276123456", "4", site_name="Kabala", lang="en")
    assert resp_opt4.startswith("END")
    assert "Report received" in resp_opt4

    # Invalid option -> Invalid prompt
    resp_invalid = handle_ussd_session("sess-1", "+23276123456", "99", site_name="Kabala", lang="en")
    assert resp_invalid.startswith("END")
    assert "Invalid selection" in resp_invalid
