from milana_site.aksi import ResonanceConsole, ResonanceInput


def test_resonance_analyze_reports_alignment():
    console = ResonanceConsole()
    payload = ResonanceInput(empathy=9, focus=7, risk=2, channel="aether", mantra="доброта")
    report = console.analyze(payload)
    assert "резонанс удержан" in report.alignment
    assert "ритмичные" in report.cadence
    assert report.caution == "сценарий стабилен"


def test_resonance_handles_high_risk_quantum():
    console = ResonanceConsole()
    payload = ResonanceInput(empathy=6, focus=8, risk=9, channel="quantum")
    report = console.analyze(payload)
    assert "микропаузами" in report.cadence
    assert "немедленно" in report.caution
