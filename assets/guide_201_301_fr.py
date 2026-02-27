#!/usr/bin/env python3
"""
BuildFi — Guide 201 + Bonus 301
201: Optimiser votre retraite — Stratégies intermédiaires
301: Maîtriser les leviers — Stratégies avancées (Bonus)
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Flowable, KeepTogether, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle, Polygon
from reportlab.graphics import renderPDF
import os

# ═══ FONTS ═══
pdfmetrics.registerFont(TTFont('Body', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('BodyBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Display', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DisplayBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DisplayItalic', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Mono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

# ═══ COLORS ═══
MARINE     = HexColor('#1a2744')
GOLD       = HexColor('#b8860b')
GOLD_LIGHT = HexColor('#d4a843')
CREAM      = HexColor('#faf8f4')
SAND       = HexColor('#e8e4db')
SAND_LIGHT = HexColor('#f2efe9')
FOREST     = HexColor('#1a7a4c')
FOREST_BG  = HexColor('#eef7f1')
BRICK      = HexColor('#b91c1c')
BRICK_BG   = HexColor('#fdf2f2')
MARINE_BG  = HexColor('#f0f2f6')
GOLD_BG    = HexColor('#fdf8ef')
TEXT_DARK   = HexColor('#2d2d2d')
TEXT_MED    = HexColor('#555555')
TEXT_LIGHT  = HexColor('#888888')
QC_BLUE     = HexColor('#003DA5')
# 301 accent
PURPLE      = HexColor('#5b21b6')
PURPLE_BG   = HexColor('#f5f3ff')

W, H = letter
ML, MR, MT, MB = 60, 60, 60, 55
CW = W - ML - MR

# ═══ STYLES ═══
S = {}
S['ch_title'] = ParagraphStyle('ChT', fontName='DisplayBold', fontSize=21, textColor=MARINE, leading=26, spaceAfter=6)
S['ch_sub'] = ParagraphStyle('ChS', fontName='DisplayItalic', fontSize=11, textColor=TEXT_MED, leading=14, spaceAfter=16)
S['h2'] = ParagraphStyle('H2', fontName='BodyBold', fontSize=12.5, textColor=MARINE, leading=17, spaceBefore=18, spaceAfter=8)
S['h3'] = ParagraphStyle('H3', fontName='BodyBold', fontSize=10.5, textColor=GOLD, leading=14, spaceBefore=14, spaceAfter=6)
S['body'] = ParagraphStyle('B', fontName='Body', fontSize=9.5, textColor=TEXT_DARK, leading=14.5, spaceAfter=8, alignment=TA_JUSTIFY)
S['body_intro'] = ParagraphStyle('BI', fontName='Body', fontSize=10, textColor=TEXT_MED, leading=15, spaceAfter=12)
S['box_body'] = ParagraphStyle('BB', fontName='Body', fontSize=9, textColor=TEXT_DARK, leading=13.5, spaceAfter=3)
S['box_title'] = ParagraphStyle('BT', fontName='BodyBold', fontSize=9, leading=12, spaceAfter=4)
S['pullquote'] = ParagraphStyle('PQ', fontName='DisplayItalic', fontSize=12.5, textColor=MARINE, leading=18, spaceBefore=16, spaceAfter=16, alignment=TA_CENTER, leftIndent=25, rightIndent=25)
S['toc_item'] = ParagraphStyle('TOC', fontName='Body', fontSize=9.5, textColor=MARINE, leading=18)
S['disclaimer'] = ParagraphStyle('Disc', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9.5, alignment=TA_JUSTIFY)
S['section_divider'] = ParagraphStyle('SD', fontName='DisplayBold', fontSize=16, textColor=GOLD, leading=20, alignment=TA_CENTER, spaceBefore=20, spaceAfter=10)

# ═══ CUSTOM FLOWABLES (identical to 101) ═══

class GoldRule(Flowable):
    def __init__(self, width=100, thickness=1.5):
        Flowable.__init__(self)
        self.width = width
        self.height = thickness + 6
        self._t = thickness
    def draw(self):
        self.canv.setStrokeColor(GOLD_LIGHT)
        self.canv.setLineWidth(self._t)
        x = (CW - self.width) / 2
        self.canv.line(x, self.height/2, x + self.width, self.height/2)


class InfoBox(Flowable):
    BOX_CFG = {
        'dollars':   (GOLD_BG,   GOLD,   GOLD),
        'saviez':    (MARINE_BG, MARINE, MARINE),
        'attention': (BRICK_BG,  BRICK,  BRICK),
        'bon':       (FOREST_BG, FOREST, FOREST),
        'quebec':    (MARINE_BG, QC_BLUE,QC_BLUE),
        'brief':     (SAND_LIGHT,GOLD,   GOLD),
        'expert':    (PURPLE_BG, PURPLE, PURPLE),
    }

    def __init__(self, box_type, title, content_paras, width=None):
        Flowable.__init__(self)
        self.box_type = box_type
        self.title_text = title
        self.content_paras = content_paras
        self._width = width or CW
        self._calc()

    def _cfg(self):
        return self.BOX_CFG.get(self.box_type, self.BOX_CFG['saviez'])

    def _calc(self):
        bg, accent, tc = self._cfg()
        ts = ParagraphStyle('_bt', parent=S['box_title'], textColor=tc)
        pad = 12
        h = pad
        from reportlab.platypus.paragraph import Paragraph as P
        t = P(self.title_text, ts)
        _, th = t.wrap(self._width - 2*pad - 16, 1000)
        h += th + 3
        for txt in self.content_paras:
            p = P(txt, S['box_body'])
            _, ph = p.wrap(self._width - 2*pad - 8, 1000)
            h += ph + 2
        h += pad
        self.height = h
        self._ts = ts

    def wrap(self, aw, ah):
        self._width = min(self._width, aw)
        self._calc()
        return (self._width, self.height)

    def draw(self):
        bg, accent, tc = self._cfg()
        c = self.canv
        pad, bar = 12, 3.5
        r = 5
        c.setFillColor(bg); c.setStrokeColor(bg)
        c.roundRect(0, 0, self._width, self.height, r, fill=1, stroke=0)
        c.setFillColor(accent)
        c.rect(0, r, bar, self.height - 2*r, fill=1, stroke=0)
        c.rect(0, 0, bar+r, r, fill=1, stroke=0)
        c.rect(0, self.height-r, bar+r, r, fill=1, stroke=0)
        c.setFillColor(bg)
        c.circle(r, r, r, fill=1, stroke=0)
        c.circle(r, self.height-r, r, fill=1, stroke=0)
        c.setFillColor(accent)
        c.rect(0, r, bar, self.height-2*r, fill=1, stroke=0)

        from reportlab.platypus.paragraph import Paragraph as P
        y = self.height - pad
        t = P(self.title_text, self._ts)
        _, th = t.wrap(self._width - 2*pad - 8, 1000)
        y -= th; t.drawOn(c, pad+8, y); y -= 4
        for txt in self.content_paras:
            p = P(txt, S['box_body'])
            _, ph = p.wrap(self._width - 2*pad - 8, 1000)
            y -= ph; p.drawOn(c, pad+8, y); y -= 1


class ChapterHeader(Flowable):
    def __init__(self, num, title, subtitle=None):
        Flowable.__init__(self)
        self.num = str(num); self.title = title; self.sub = subtitle
        self.height = 66 if subtitle else 50
    def wrap(self, aw, ah): return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setFont('DisplayBold', 48); c.setFillColor(HexColor('#e5e0d8'))
        c.drawString(0, self.height - 44, self.num)
        from reportlab.platypus.paragraph import Paragraph as P
        ox = 36 if len(self.num)==1 else 50
        t = P(self.title, S['ch_title']); _, th = t.wrap(CW-ox, 100)
        t.drawOn(c, ox, self.height - 26)
        if self.sub:
            s = P(self.sub, S['ch_sub']); s.wrap(CW-ox, 100)
            s.drawOn(c, ox, self.height - 26 - th - 1)


class PullQuote(Flowable):
    def __init__(self, text):
        Flowable.__init__(self)
        self.text = text
        self.height = 50
    def wrap(self, aw, ah):
        from reportlab.platypus.paragraph import Paragraph as P
        p = P(f'<i>«\u00a0{self.text}\u00a0»</i>', S['pullquote'])
        _, h = p.wrap(aw - 60, 1000)
        self.height = h + 24
        self._p = p
        self._aw = aw
        return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setStrokeColor(GOLD_LIGHT); c.setLineWidth(1)
        mid = self._aw / 2
        c.line(mid-50, self.height-4, mid+50, self.height-4)
        self._p.drawOn(c, 30, 10)
        c.line(mid-50, 6, mid+50, 6)


class SectionDivider(Flowable):
    """Full-width divider between 201 and 301 sections"""
    def __init__(self, title, subtitle, accent_color=GOLD):
        Flowable.__init__(self)
        self.title = title
        self.subtitle = subtitle
        self.accent = accent_color
        self.height = 80
    def wrap(self, aw, ah): return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setFillColor(self.accent)
        c.rect(0, self.height-3, CW, 3, fill=1, stroke=0)
        c.setFont('DisplayBold', 18); c.setFillColor(MARINE)
        c.drawCentredString(CW/2, self.height-30, self.title)
        c.setFont('DisplayItalic', 10); c.setFillColor(TEXT_MED)
        c.drawCentredString(CW/2, self.height-48, self.subtitle)
        c.setFillColor(self.accent)
        c.rect(0, 22, CW, 1.5, fill=1, stroke=0)


# ═══ GRAPHIC BUILDERS ═══

def make_meltdown_chart():
    """RRSP meltdown: conventional vs optimized withdrawal"""
    d = Drawing(CW, 100)
    lw = 140; bw = CW - lw - 10
    # Title
    d.add(String(CW/2, 92, "Retrait conventionnel vs Meltdown REER — Impact fiscal", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    # Row 1 - Conventional
    y1 = 58
    d.add(String(0, y1+4, "Conventionnel", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw * 0.85
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "FERR forcé à 72  •  Taux marginal ~45 %  •  Clawback PSV", fontSize=7.5, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    # Row 2 - Meltdown
    y2 = 28
    d.add(String(0, y2+4, "Meltdown optimisé", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * 0.45
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "Retraits lissés 60-72  •  Taux ~30 %  •  PSV protégée", fontSize=7.5, fontName='Body', fillColor=FOREST))
    # Savings callout
    d.add(String(CW/2, 6, "Économie potentielle estimée* : 40 000 à 120 000 $ sur 25 ans", fontSize=8.5, fontName='BodyBold', fillColor=GOLD, textAnchor='middle'))
    return d


def make_withdrawal_order():
    """Optimal withdrawal order cascade"""
    d = Drawing(CW, 170)
    box_w, box_h = 320, 22
    x0 = (CW - box_w) / 2
    steps = [
        ("1. Compte non enregistré (NR)", TEXT_MED),
        ("2. REER / FERR (meltdown contrôlé)", BRICK),
        ("3. Pension / Rentes", MARINE),
        ("4. CÉLI (dernier recours)", FOREST),
    ]
    y_start = 138
    d.add(String(CW/2, 162, "Ordre de décaissement optimal — Minimiser l'impôt à vie", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    for i, (label, col) in enumerate(steps):
        y = y_start - i * 32
        d.add(Rect(x0, y, box_w, box_h, fillColor=col, strokeColor=None, rx=4, ry=4))
        d.add(String(x0 + box_w/2, y+6, label, fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
        if i < len(steps) - 1:
            ax = x0 + box_w/2; ay = y - 1
            d.add(Line(ax, ay, ax, ay-5, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
            d.add(Polygon([ax-4, ay-5, ax+4, ay-5, ax, ay-10], fillColor=GOLD_LIGHT, strokeColor=None))
    return d


def make_oas_clawback_chart():
    """OAS clawback zone visualization"""
    d = Drawing(CW, 70)
    bar_y, bar_h = 22, 18
    # Zones
    safe_end = CW * 0.55  # 95K zone
    claw_end = CW * 0.90  # 95K-155K zone
    d.add(Rect(0, bar_y, safe_end, bar_h, fillColor=FOREST, strokeColor=None))
    d.add(String(safe_end/2, bar_y+4, "PSV pleine  •  < 95 323 $", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(Rect(safe_end, bar_y, claw_end-safe_end, bar_h, fillColor=GOLD, strokeColor=None))
    d.add(String((safe_end+claw_end)/2, bar_y+4, "Récupération 15 ¢/$", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(Rect(claw_end, bar_y, CW-claw_end, bar_h, fillColor=BRICK, strokeColor=None))
    d.add(String((claw_end+CW)/2, bar_y+4, "0 $", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Labels
    d.add(String(safe_end, 10, "95 323 $", fontSize=7.5, fontName='Mono', fillColor=GOLD, textAnchor='middle'))
    d.add(String(claw_end, 10, "~155 000 $", fontSize=7.5, fontName='Mono', fillColor=BRICK, textAnchor='middle'))
    d.add(String(CW/2, 56, "Zone de récupération PSV 2026 — Revenu net", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d


def make_tax_bracket_chart():
    """Federal + provincial combined marginal rates"""
    d = Drawing(CW, 95)
    lw = 120; bw = CW - lw - 10
    d.add(String(CW/2, 88, "Taux marginal combiné (fédéral + Québec) — 2026", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    brackets = [
        ("0 – 57 375 $", 27.5, HexColor('#4ade80')),
        ("57 375 – 114 750 $", 37.1, GOLD),
        ("114 750 – 177 882 $", 45.7, HexColor('#e8a040')),
        ("177 882 – 253 414 $", 49.97, BRICK),
        ("253 414 $ +", 53.31, HexColor('#7f1d1d')),
    ]
    for i, (label, rate, col) in enumerate(brackets):
        y = 60 - i * 14
        d.add(String(0, y+2, label, fontSize=7.5, fontName='Mono', fillColor=TEXT_MED))
        bar_w = rate / 55 * bw
        d.add(Rect(lw, y, bar_w, 11, fillColor=col, strokeColor=None, rx=2, ry=2))
        d.add(String(lw+bar_w+5, y+1, f"{rate} %", fontSize=7.5, fontName='BodyBold', fillColor=col))
    return d


def make_effective_marginal_chart():
    """Stacked bar showing how clawbacks stack to create extreme effective marginal rates"""
    d = Drawing(CW, 145)
    d.add(String(CW/2, 138, "Taux marginal effectif réel — Effets en cascade", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 125
    bw = CW - lw - 50
    max_rate = 82

    scenarios = [
        ("Salarié 80K$", 100, [("Impôt", 32.5, MARINE)]),
        ("Retraité 100K$", 80, [("Impôt", 37.1, MARINE), ("PSV 15%", 15.0, BRICK)]),
        ("Retraité 22K$", 60, [("Impôt", 15.0, MARINE), ("SRG 50%", 50.0, BRICK), ("TPS", 5.0, HexColor('#e8a040'))]),
    ]

    y_start = 108
    bar_h = 22
    gap = 30

    for i, (label, _, components) in enumerate(scenarios):
        y = y_start - i * gap
        sz = 8.5 if '22K' not in label else 8.5
        d.add(String(0, y+5, label, fontSize=sz, fontName='BodyBold', fillColor=TEXT_DARK))

        x = lw
        total = 0
        for comp_label, rate, col in components:
            w = rate / max_rate * bw
            d.add(Rect(x, y, w, bar_h, fillColor=col, strokeColor=None))
            if w > 30:
                d.add(String(x + w/2, y+6, comp_label, fontSize=6.5, fontName='Body', fillColor=white, textAnchor='middle'))
            x += w
            total += rate

        d.add(String(x + 6, y+5, f"{total:.0f} %", fontSize=9, fontName='BodyBold',
                      fillColor=BRICK if total > 50 else GOLD))

    for pct in [0, 20, 40, 60, 80]:
        x = lw + pct / max_rate * bw
        d.add(String(x, 20, f"{pct}%", fontSize=6.5, fontName='Mono', fillColor=TEXT_LIGHT, textAnchor='middle'))

    d.add(Rect(lw, 5, 10, 8, fillColor=MARINE, strokeColor=None))
    d.add(String(lw+14, 6, "Impôt", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+55, 5, 10, 8, fillColor=BRICK, strokeColor=None))
    d.add(String(lw+69, 6, "Récupération (PSV, SRG)", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+195, 5, 10, 8, fillColor=HexColor('#e8a040'), strokeColor=None))
    d.add(String(lw+209, 6, "Crédit TPS perdu", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

    return d


def make_fee_impact_chart():
    """MER impact over 30 years"""
    d = Drawing(CW, 90)
    lw = 130; bw = CW - lw - 10
    d.add(String(CW/2, 82, "Impact des frais de gestion (MER) sur 30 ans — 200 000 $ investis", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    items = [
        ("FNB 0,20 %", 578000, FOREST),
        ("Robot 0,50 %", 523000, GOLD),
        ("Fonds 2,20 %", 349000, BRICK),
    ]
    max_val = 578000
    for i, (label, val, col) in enumerate(items):
        y = 50 - i * 22
        d.add(String(0, y+4, label, fontSize=8.5, fontName='BodyBold', fillColor=col))
        bar_w = val / max_val * bw
        d.add(Rect(lw, y, bar_w, 16, fillColor=col, strokeColor=None, rx=3, ry=3))
        d.add(String(lw + bar_w + 6, y+3, f"{val:,} $".replace(",", " "), fontSize=8, fontName='Mono', fillColor=col))
    d.add(String(CW/2, 0, "Différence FNB vs fonds actifs : 229 000 $", fontSize=8.5, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    return d


def make_splitting_chart():
    """Pension income splitting benefit"""
    d = Drawing(CW, 80)
    lw = 140; bw = CW - lw - 10
    d.add(String(CW/2, 72, "Fractionnement du revenu — Couple 65+, pension 60 000 $", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    y1 = 40
    d.add(String(0, y1+4, "Sans fractionnement", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw * 0.75
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "Un seul contribuable taxé  •  Taux marginal élevé", fontSize=7.5, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    y2 = 12
    d.add(String(0, y2+4, "Avec fractionnement", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * 0.45
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "50 % transféré au conjoint  •  2 paliers bas utilisés", fontSize=7.5, fontName='Body', fillColor=FOREST))
    return d


def make_sequence_risk_chart():
    """Two retirees, same average return, different sequences — dramatic difference"""
    d = Drawing(CW, 140)
    d.add(String(CW/2, 132, "Même rendement moyen de 6 % — séquences inversées", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 115
    bw = CW - lw - 80

    # Retiree A: bad years first
    y1 = 94
    d.add(String(0, y1+8, "Retraité A", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    d.add(String(0, y1-4, "(krach au début)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    # Mini sequence bars showing returns
    seq_a = [-25, -10, 5, 12, 18, 20, 15, 10, 8, 7]
    bar_w = bw / len(seq_a)
    for j, ret in enumerate(seq_a):
        col = BRICK if ret < 0 else FOREST_BG
        h = abs(ret) / 25 * 18
        d.add(Rect(lw + j * bar_w, y1 + (18-h)/2, bar_w-1, h, fillColor=col, strokeColor=None))
    d.add(String(lw + bw + 6, y1+8, "Solde à 85 ans:", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(String(lw + bw + 6, y1-4, "180 000 $", fontSize=10, fontName='BodyBold', fillColor=BRICK))

    # Retiree B: good years first
    y2 = 42
    d.add(String(0, y2+8, "Retraité B", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    d.add(String(0, y2-4, "(krach à la fin)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    seq_b = [20, 18, 15, 12, 10, 8, 7, 5, -10, -25]
    for j, ret in enumerate(seq_b):
        col = BRICK if ret < 0 else FOREST_BG
        h = abs(ret) / 25 * 18
        d.add(Rect(lw + j * bar_w, y2 + (18-h)/2, bar_w-1, h, fillColor=col, strokeColor=None))
    d.add(String(lw + bw + 6, y2+8, "Solde à 85 ans:", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(String(lw + bw + 6, y2-4, "620 000 $", fontSize=10, fontName='BodyBold', fillColor=FOREST))

    # Bottom message
    d.add(String(CW/2, 14, "Même portefeuille. Même rendement moyen. 440 000 $ de différence.", fontSize=9, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    d.add(Rect(lw, 2, 10, 8, fillColor=BRICK, strokeColor=None))
    d.add(String(lw+14, 3, "Année négative", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+100, 2, 10, 8, fillColor=FOREST_BG, strokeColor=None))
    d.add(String(lw+114, 3, "Année positive", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

    return d


def make_property_sale_timing():
    """Impact of selling rental property before vs after retirement"""
    d = Drawing(CW, 110)
    lw = 135; bw = CW - lw - 10
    d.add(String(CW/2, 102, "Vente d'immeuble locatif — Impact fiscal selon le moment", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    # Scenario: 200K gain + 80K recapture
    y1 = 68
    d.add(String(0, y1+8, "Vente à 58 ans", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    d.add(String(0, y1-4, "(pré-retraite)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    items1 = [
        ("GC 100K", 100/280, GOLD),
        ("Récup. DPA 80K", 80/280, BRICK),
        ("Impôt ~52K", 52/280, MARINE),
    ]
    x = lw
    for label, frac, col in items1:
        w = frac * bw
        d.add(Rect(x, y1, w, 20, fillColor=col, strokeColor=None))
        if w > 35:
            d.add(String(x+w/2, y1+5, label, fontSize=6.5, fontName='Body', fillColor=white, textAnchor='middle'))
        x += w
    d.add(String(x+6, y1+4, "Taux ~37 %", fontSize=8, fontName='BodyBold', fillColor=GOLD))

    y2 = 30
    d.add(String(0, y2+8, "Vente à 66 ans", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    d.add(String(0, y2-4, "(avec PSV + RRQ)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    x = lw
    items2 = [
        ("GC 100K", 100/280, GOLD),
        ("Récup. 80K", 80/280, BRICK),
        ("Impôt ~71K", 71/280, MARINE),
        ("PSV perdue", 20/280, HexColor('#7f1d1d')),
    ]
    for label, frac, col in items2:
        w = frac * bw
        d.add(Rect(x, y2, w, 20, fillColor=col, strokeColor=None))
        if w > 30:
            d.add(String(x+w/2, y2+5, label, fontSize=6.5, fontName='Body', fillColor=white, textAnchor='middle'))
        x += w
    d.add(String(x+6, y2+4, "Taux ~50 %", fontSize=8, fontName='BodyBold', fillColor=BRICK))

    d.add(String(CW/2, 6, "Même immeuble, même gain — 19 000 $ de plus en impôt à cause du timing", fontSize=8.5, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    return d


def make_smith_manoeuvre_diagram():
    """Smith Manoeuvre flow diagram"""
    d = Drawing(CW, 130)
    d.add(String(CW/2, 122, "Smith Manoeuvre — Le mécanisme", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    bw, bh = 140, 24
    # Box 1: Hypothèque
    x1, y1 = 20, 85
    d.add(Rect(x1, y1, bw, bh, fillColor=BRICK, strokeColor=None, rx=4, ry=4))
    d.add(String(x1+bw/2, y1+7, "Hypothèque (non déductible)", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow down
    d.add(Line(x1+bw/2, y1, x1+bw/2, y1-8, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(String(x1+bw/2+5, y1-6, "remboursement", fontSize=6, fontName='Body', fillColor=TEXT_MED))
    # Box 2: HELOC
    y2 = 48
    d.add(Rect(x1, y2, bw, bh, fillColor=GOLD, strokeColor=None, rx=4, ry=4))
    d.add(String(x1+bw/2, y2+7, "HELOC libérée", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow right
    ax = x1+bw+5
    d.add(Line(ax, y2+bh/2, ax+30, y2+bh/2, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(Polygon([ax+30, y2+bh/2+4, ax+30, y2+bh/2-4, ax+36, y2+bh/2], fillColor=GOLD_LIGHT, strokeColor=None))
    d.add(String(ax+15, y2+bh/2+6, "emprunt", fontSize=6, fontName='Body', fillColor=TEXT_MED))
    # Box 3: Investissement
    x3 = ax + 40
    d.add(Rect(x3, y2, bw, bh, fillColor=FOREST, strokeColor=None, rx=4, ry=4))
    d.add(String(x3+bw/2, y2+7, "Investissement (dividendes)", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow down from invest
    y3 = 12
    d.add(Line(x3+bw/2, y2, x3+bw/2, y3+bh, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    # Box 4: Result
    d.add(Rect(x3, y3, bw, bh, fillColor=MARINE, strokeColor=None, rx=4, ry=4))
    d.add(String(x3+bw/2, y3+7, "Intérêts HELOC déductibles", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow left from HELOC down
    d.add(Line(x1+bw/2, y2, x1+bw/2, y3+bh, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(Rect(x1, y3, bw, bh, fillColor=MARINE_BG, strokeColor=MARINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(x1+bw/2, y3+7, "Hypothèque → 0 $ à terme", fontSize=7.5, fontName='BodyBold', fillColor=MARINE, textAnchor='middle'))

    return d


def make_salary_vs_dividend_chart():
    """Salary vs dividend effective combined rate comparison"""
    d = Drawing(CW, 100)
    lw = 135; bw = CW - lw - 10
    d.add(String(CW/2, 92, "Salaire vs Dividende — Taux effectif combiné (corporatif + personnel)", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    max_rate = 55
    items = [
        ("Salaire 80K$", [("Corp. 0 %", 0, SAND), ("Perso. 32 %", 32, MARINE)], 32),
        ("Div. déterminé 80K$", [("Corp. 12,2 %", 12.2, GOLD), ("Perso. 24 %", 24, MARINE)], 36.2),
        ("Div. ordinaire 80K$", [("Corp. 12,2 %", 12.2, GOLD), ("Perso. 28 %", 28, MARINE)], 40.2),
        ("Div. dét. 80K$ + PSV", [("Corp. 12,2 %", 12.2, GOLD), ("Perso. 24 %", 24, MARINE), ("PSV", 8, BRICK)], 44.2),
    ]

    for i, (label, components, total) in enumerate(items):
        y = 62 - i * 18
        d.add(String(0, y+3, label, fontSize=7.5, fontName='BodyBold', fillColor=TEXT_DARK))
        x = lw
        for comp_label, rate, col in components:
            if rate > 0:
                w = rate / max_rate * bw
                d.add(Rect(x, y, w, 14, fillColor=col, strokeColor=None))
                if w > 25:
                    d.add(String(x+w/2, y+3, comp_label, fontSize=5.5, fontName='Body', fillColor=white if col != SAND else TEXT_MED, textAnchor='middle'))
                x += w
        d.add(String(x+5, y+2, f"{total:.0f} %", fontSize=7.5, fontName='BodyBold', fillColor=BRICK if total > 40 else GOLD))

    return d


# ═══ TABLE BUILDERS ═══

def make_decumulation_table():
    """When to withdraw from which account"""
    hs = ParagraphStyle('TH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    cs = ParagraphStyle('TC', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11)
    cb = ParagraphStyle('TCB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11, alignment=TA_CENTER)

    data = [
        [Paragraph('Phase', hs), Paragraph('Âge', hs), Paragraph('Action', hs), Paragraph('Raison', hs)],
        [Paragraph('Pré-retraite', cs), Paragraph('55-60', cb), Paragraph('NR + meltdown REER', cb), Paragraph('Remplir palier 1 avant RRQ', cs)],
        [Paragraph('Transition', cs), Paragraph('60-65', cb), Paragraph('RRQ (si reporté) + NR + REER', cb), Paragraph('Arbitrage fiscal pré-PSV', cs)],
        [Paragraph('Croisière', cs), Paragraph('65-72', cb), Paragraph('PSV + RRQ + REER résiduel', cb), Paragraph('Protéger seuil PSV', cs)],
        [Paragraph('FERR obligatoire', cs), Paragraph('72+', cb), Paragraph('FERR (retraits min.) + CÉLI', cb), Paragraph('CÉLI = dernier recours', cs)],
    ]
    col_w = [CW*0.16, CW*0.12, CW*0.36, CW*0.36]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MARINE),
        ('BACKGROUND', (0,1), (-1,-1), white),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, SAND),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,2), (-1,2), HexColor('#f8f6f2')),
        ('BACKGROUND', (0,4), (-1,4), HexColor('#f8f6f2')),
    ]))
    return t


def make_rrq_timing_table():
    """CPP/QPP claiming age comparison with exact 2026 numbers"""
    hs = ParagraphStyle('TH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    cs = ParagraphStyle('TC', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11, alignment=TA_CENTER)
    cb = ParagraphStyle('TCB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11, alignment=TA_CENTER)

    data = [
        [Paragraph('', hs), Paragraph('60 ans', hs), Paragraph('65 ans', hs), Paragraph('70 ans', hs)],
        [Paragraph('<b>Ajustement</b>', cs), Paragraph('-36 %', cb), Paragraph('Référence', cb), Paragraph('+42 %', cb)],
        [Paragraph('<b>Rente maximale</b>', cs), Paragraph('965 $/m', cb), Paragraph('1 508 $/m', cb), Paragraph('2 141 $/m', cb)],
        [Paragraph('<b>Point mort vs 65</b>', cs), Paragraph('—', cb), Paragraph('—', cb), Paragraph('~82 ans', cb)],
        [Paragraph('<b>Avantage si longévité</b>', cs), Paragraph('Décès < 74', cb), Paragraph('Équilibre', cb), Paragraph('Décès > 82', cb)],
    ]
    col_w = [CW*0.28, CW*0.24, CW*0.24, CW*0.24]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MARINE),
        ('BACKGROUND', (0,1), (0,-1), SAND_LIGHT),
        ('BACKGROUND', (1,1), (-1,-1), white),
        ('GRID', (0,0), (-1,-1), 0.5, SAND),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND', (1,2), (-1,2), HexColor('#f8f6f2')),
        ('BACKGROUND', (1,4), (-1,4), HexColor('#f8f6f2')),
    ]))
    return t


# ═══ PAGE TEMPLATES ═══

def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setStrokeColor(SAND); canvas.setLineWidth(0.5)
    canvas.line(ML, MB-10, W-MR, MB-10)
    canvas.setFont('Body', 7.5); canvas.setFillColor(TEXT_LIGHT)
    canvas.drawString(ML, MB-22, "buildfi.ca")
    canvas.drawRightString(W-MR, MB-22, f"Optimiser votre retraite — p.\u2009{doc.page}")
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(1.5)
    canvas.line(ML, H-32, W-MR, H-32)
    canvas.restoreState()

def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM); canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Top accent bar
    canvas.setFillColor(GOLD); canvas.rect(0, H-8, W, 8, fill=1, stroke=0)
    # Hero block
    canvas.setFillColor(MARINE); canvas.rect(0, H-270, W, 262, fill=1, stroke=0)
    # Large watermark numbers
    canvas.setFont('DisplayBold', 90); canvas.setFillColor(HexColor('#243558'))
    canvas.drawString(W-250, H-170, "201")
    canvas.setFont('DisplayBold', 60); canvas.setFillColor(HexColor('#2a3d5e'))
    canvas.drawString(W-170, H-235, "301")
    # Branding
    canvas.setFont('DisplayBold', 13); canvas.setFillColor(GOLD_LIGHT)
    canvas.drawString(ML+10, H-65, "BuildFi")
    # Title
    canvas.setFont('DisplayBold', 28); canvas.setFillColor(white)
    canvas.drawString(ML+10, H-120, "Optimiser")
    canvas.drawString(ML+10, H-153, "votre retraite")
    canvas.setFont('Body', 10.5); canvas.setFillColor(HexColor('#a0b0cc'))
    canvas.drawString(ML+10, H-183, "Décaissement, fiscalité et optimisation")
    canvas.setFont('Body', 9.5); canvas.setFillColor(HexColor('#8899bb'))
    canvas.drawString(ML+10, H-198, "Pour patrimoines établis")
    # Gold separator
    canvas.setFillColor(GOLD); canvas.rect(0, H-273, W, 3, fill=1, stroke=0)
    # Description
    canvas.setFont('DisplayItalic', 12.5); canvas.setFillColor(MARINE)
    canvas.drawString(ML+10, H-316, "Fiscalité. Décaissement. Frais.")
    canvas.drawString(ML+10, H-334, "Les leviers qui changent tout.")
    canvas.setFont('Body', 9.5); canvas.setFillColor(TEXT_MED)
    y = H - 376
    for line in [
        "Ce guide s'adresse aux ménages ayant accumulé",
        "un patrimoine significatif (REER, CÉLI, immeubles",
        "ou entreprise incorporée). Il transforme vos",
        "connaissances en décisions concrètes.",
    ]:
        canvas.drawString(ML+10, y, line); y -= 15
    # Highlights
    y -= 18
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(0.5)
    canvas.line(ML+10, y, ML+150, y); y -= 16
    highlights = [
        ("201", "Décaissement  •  Fiscalité  •  Frais  •  Pensions"),
        ("201", "Fractionnement  •  Protection PSV  •  Risques"),
        ("301", "Meltdown REER  •  Guardrails  •  Entreprise"),
    ]
    for badge, desc in highlights:
        col = GOLD if badge == "201" else PURPLE
        canvas.setFont('BodyBold', 8); canvas.setFillColor(col)
        canvas.drawString(ML+10, y, badge)
        canvas.setFont('Body', 8); canvas.setFillColor(TEXT_MED)
        canvas.drawString(ML+45, y, desc)
        y -= 14
    # Footer
    canvas.setFont('Body', 8.5); canvas.setFillColor(TEXT_LIGHT)
    canvas.drawString(ML+10, 72, "Inclus avec votre Bilan Intermédiaire BuildFi")
    canvas.setFont('Body', 7.5)
    canvas.drawString(ML+10, 58, "Chiffres à jour — Année fiscale 2026  •  Adapté au Québec et au Canada")
    canvas.setFillColor(GOLD); canvas.rect(0, 0, W, 4, fill=1, stroke=0)
    canvas.restoreState()


# ═══ BUILD DOCUMENT ═══

def build():
    path = "/home/claude/guide-201-301-v2.pdf"
    doc = BaseDocTemplate(path, pagesize=letter,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title="BuildFi — Optimiser votre retraite (201 + Bonus 301)",
        author="BuildFi")

    f_content = Frame(ML, MB, CW, H-MT-MB, id='content')
    f_cover = Frame(ML, MB, CW, H-MT-MB, id='cover')
    doc.addPageTemplates([
        PageTemplate(id='Cover', frames=[f_cover], onPage=cover_page),
        PageTemplate(id='Content', frames=[f_content], onPage=page_bg),
    ])

    story = []
    story.append(NextPageTemplate('Content'))
    story.append(PageBreak())

    # ════════════════════════════════════════
    # TABLE OF CONTENTS
    # ════════════════════════════════════════
    story.append(Spacer(1, 6))
    story.append(Paragraph("Dans ce guide", S['ch_title']))
    story.append(GoldRule(70, 1.5))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        '<font name="BodyBold" size="10" color="#b8860b">PARTIE 201 — Stratégies intermédiaires</font>', S['toc_item']))
    story.append(Spacer(1, 4))
    for num, title, sub in [
        ("1","Quand et comment décaisser","L'ordre qui minimise votre impôt"),
        ("2","La fiscalité à la retraite","Paliers, crédits et pièges"),
        ("3","Protéger votre PSV","Le clawback et comment l'éviter"),
        ("4","Choisir votre âge RRQ/RPC","60, 65 ou 70 — l'analyse complète"),
        ("5","Le fractionnement du revenu","Diviser pour économiser"),
        ("6","Les frais de gestion","Le coût invisible qui gruge votre patrimoine"),
        ("7","Les risques que personne ne mentionne","Longévité, inflation, séquence"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#b8860b" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">— {sub}</font>', S['toc_item']))

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        '<font name="BodyBold" size="10" color="#5b21b6">BONUS 301 — Stratégies avancées</font>', S['toc_item']))
    story.append(Spacer(1, 4))
    for num, title, sub in [
        ("8","Le meltdown REER en détail","Vidange stratégique avant 72 ans"),
        ("9","Guardrails — dépenser sans tomber","Ajuster vos retraits au marché"),
        ("10","L'immobilier dans le plan de retraite","DPA, Smith Manoeuvre et timing de vente"),
        ("11","L'entreprise incorporée et la retraite","CCPC, extraction et optimisation"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#5b21b6" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">— {sub}</font>', S['toc_item']))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8' color='#888888'>"
        "Ce guide est fourni à titre informatif et éducatif seulement. Il ne constitue pas un conseil financier, "
        "fiscal, juridique ou de placement personnalisé. Les stratégies et exemples présentés sont de nature générale "
        "et les résultats varient selon la situation personnelle, la province et la composition du patrimoine. "
        "Consultez un planificateur financier certifié (Pl.\u00a0Fin.) ou un fiscaliste avant toute décision."
        "</font>", S['body']))
    story.append(Spacer(1, 8))
    story.append(InfoBox('saviez', 'PRÉREQUIS', [
        'Ce guide suppose que vous connaissez le REER, le CÉLI, la PSV et le RRQ. '
        'Si ces termes ne vous sont pas familiers, commencez par le <font name="BodyBold">Guide 101 — Les bases de vos finances</font>.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Par où commencer?", S['h2']))
    story.append(Paragraph(
        "Vous n'avez pas besoin de lire ce guide de A à Z. Commencez par la section "
        "qui correspond à votre situation\u00a0:", S['body']))
    story.append(Spacer(1, 4))

    nav_hs = ParagraphStyle('NavH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    nav_s = ParagraphStyle('NavS', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11)
    nav_b = ParagraphStyle('NavB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11)

    nav_data = [
        [Paragraph('Votre situation', nav_hs), Paragraph('Commencez par', nav_hs), Paragraph('Puis explorez', nav_hs)],
        [Paragraph('Je prends ma retraite bientôt', nav_s), Paragraph('Ch. 1 — Décaissement', nav_b), Paragraph('Ch. 4 (RRQ) → Ch. 3 (PSV)', nav_s)],
        [Paragraph('J\'ai un gros REER (500K+)', nav_s), Paragraph('Ch. 8 — Meltdown REER', nav_b), Paragraph('Ch. 3 (PSV) → Ch. 2 (Fiscalité)', nav_s)],
        [Paragraph('Nous sommes un couple', nav_s), Paragraph('Ch. 5 — Fractionnement', nav_b), Paragraph('Ch. 1 (Ordre) → Ch. 4 (RRQ)', nav_s)],
        [Paragraph('Je paie trop de frais', nav_s), Paragraph('Ch. 6 — Frais de gestion', nav_b), Paragraph('Ch. 7 (Risques)', nav_s)],
        [Paragraph('J\'ai des immeubles locatifs', nav_s), Paragraph('Ch. 10 — Immobilier', nav_b), Paragraph('Ch. 3 (PSV) → Ch. 2 (Fiscalité)', nav_s)],
        [Paragraph('J\'ai une société incorporée', nav_s), Paragraph('Ch. 11 — Entreprise', nav_b), Paragraph('Ch. 8 (Meltdown) → Ch. 9 (Guardrails)', nav_s)],
        [Paragraph('Je veux tout comprendre', nav_s), Paragraph('Ch. 1 — page 1', nav_b), Paragraph('Lisez dans l\'ordre!', nav_s)],
    ]
    nav_t = Table(nav_data, colWidths=[CW*0.35, CW*0.30, CW*0.35], repeatRows=1)
    nav_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MARINE),
        ('BACKGROUND', (0,1), (-1,-1), white),
        ('GRID', (0,0), (-1,-1), 0.5, SAND),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,2), (-1,2), HexColor('#f8f6f2')),
        ('BACKGROUND', (0,4), (-1,4), HexColor('#f8f6f2')),
        ('BACKGROUND', (0,6), (-1,6), HexColor('#f8f6f2')),
    ]))
    story.append(nav_t)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<font name='Body' size='8' color='#888888'>"
        "Chaque chapitre est autonome. Les renvois entre chapitres vous guident si un sujet en complète un autre."
        "</font>", S['body']))

    # ════════════════════════════════════════
    #  PARTIE 201 — STRATÉGIES INTERMÉDIAIRES
    # ════════════════════════════════════════

    # ═══ CH 1 — DÉCAISSEMENT ═══
    story.append(Spacer(1, 22))
    story.append(KeepTogether([
        ChapterHeader("1", "Quand et comment décaisser", "L'ordre qui minimise votre impôt à vie"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "Accumuler de l'épargne est une chose. La retirer intelligemment en est une autre. "
            "L'ordre dans lequel vous décaissez vos comptes peut facilement représenter "
            "<font name='BodyBold'>50\u202f000 à 150\u202f000\u00a0$ d'impôt en moins</font> sur 25 ans de retraite. "
            "C'est probablement la décision financière la plus importante — et la moins discutée.", S['body_intro']),
    ]))

    story.append(PullQuote("La retraite n'est pas un solde. C'est la gestion stratégique d'un flux de revenus sur 30 ans."))
    story.append(Spacer(1, 4))

    story.append(Paragraph("Le principe fondamental", S['h2']))
    story.append(Paragraph(
        "Chaque compte a un traitement fiscal différent au retrait. Le REER est imposable à 100\u00a0%. "
        "Le CÉLI est libre d'impôt. Le compte non enregistré (NR) est partiellement imposable "
        "(gains en capital à 50\u00a0%, dividendes avec crédit). L'objectif\u00a0: retirer de chaque compte "
        "au moment où le taux d'imposition est le plus bas possible.", S['body']))

    story.append(make_withdrawal_order())
    story.append(Paragraph(
        "<font name='Body' size='7' color='#888888'>* Estimation basée sur des profils types. "
        "Les résultats réels varient selon la province, le taux marginal, la taille des comptes et la situation conjugale.</font>",
        ParagraphStyle('fn', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, spaceBefore=2, spaceAfter=4)))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Les quatre phases du décaissement", S['h2']))
    story.append(make_decumulation_table())
    story.append(Spacer(1, 8))

    story.append(InfoBox('dollars', 'EN DOLLARS — L\'impact d\'un bon ordre', [
        'Couple, 65 ans, REER 400\u202f000\u00a0$, CÉLI 200\u202f000\u00a0$, NR 100\u202f000\u00a0$. '
        'Retrait conventionnel (REER en premier)\u00a0: impôt total estimé sur 25 ans = <font name="BodyBold">185\u202f000\u00a0$</font>. '
        'Retrait optimisé (meltdown + NR d\'abord + CÉLI préservé)\u00a0: <font name="BodyBold">112\u202f000\u00a0$</font>. '
        'Différence\u00a0: <font name="BodyBold">jusqu\'à 73\u202f000\u00a0$</font> d\'économie d\'impôt potentielle — selon le profil, la province et la taille du REER.',
    ]))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'Votre Bilan Intermédiaire simule automatiquement l\'ordre de retrait optimal en fonction de vos comptes, '
        'de votre province et de vos revenus de pension. L\'onglet <font name="BodyBold">Décaissement</font> montre le plan année par année.',
    ]))

    # ═══ CH 2 — FISCALITÉ ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("2", "La fiscalité à la retraite", "Ce que le gouvernement reprend — et comment limiter les dégâts"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "À la retraite, votre revenu change de nature\u00a0: salaire remplacé par pensions, retraits FERR, "
        "RRQ et PSV. Chaque source est imposée différemment. Comprendre les paliers d'imposition "
        "et les crédits disponibles, c'est comprendre pourquoi certaines décisions valent des milliers de dollars.", S['body_intro']))

    story.append(make_tax_bracket_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Revenus de retraite et leur traitement fiscal", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>FERR / REER</font> — 100\u00a0% imposable comme un salaire. C'est le compte le plus «\u00a0cher\u00a0» au retrait. "
        "<font name='BodyBold'>RRQ / RPC</font> — 100\u00a0% imposable, mais donne droit au crédit pour revenu de pension (2\u202f000\u00a0$ à 65+). "
        "<font name='BodyBold'>PSV</font> — 100\u00a0% imposable, avec un taux marginal effectif pouvant atteindre 15\u00a0% de plus (clawback). "
        "<font name='BodyBold'>CÉLI</font> — Jamais imposable. N'affecte ni la PSV, ni le SRG, ni aucun crédit. "
        "<font name='BodyBold'>Gains en capital (NR)</font> — Imposable à 50\u00a0% (inclusion). "
        "<font name='BodyBold'>Dividendes canadiens</font> — Imposable avec crédit. Taux effectif plus bas, mais majoration gonfle le revenu net (affecte la PSV).", S['body']))

    story.append(InfoBox('attention', 'ATTENTION — Le piège de la majoration des dividendes', [
        'Les dividendes canadiens sont «\u00a0majorés\u00a0» avant d\'être imposés. Un dividende déterminé de 50\u202f000\u00a0$ '
        'devient 69\u202f000\u00a0$ de revenu imposable. Même si le crédit d\'impôt réduit l\'impôt réel, '
        'ce revenu majoré peut déclencher le clawback PSV. En période de décaissement, ce piège est fréquent.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Le crédit pour revenu de pension", S['h2']))
    story.append(Paragraph(
        "À partir de 65 ans, les premiers 2\u202f000\u00a0$ de revenu de pension admissible (FERR, rente de pension DB) "
        "donnent droit à un crédit fédéral de 15\u00a0% + un crédit provincial. Au Québec, c'est environ "
        "300\u00a0$ d'économie par personne. Pour un couple, ça double. "
        "Si vous n'avez pas de pension DB, un retrait minimal de 2\u202f000\u00a0$ du FERR suffit pour déclencher le crédit.", S['body']))

    story.append(Paragraph("Le taux marginal effectif — la vraie facture", S['h2']))
    story.append(Paragraph(
        "Le taux d'imposition marginal publié par le gouvernement ne raconte pas toute l'histoire. "
        "Chaque dollar de revenu supplémentaire peut aussi réduire votre PSV, votre SRG, votre crédit "
        "pour la TPS/TVH et votre crédit en raison de l'âge. Ces récupérations s'empilent. "
        "Le résultat\u00a0: un taux marginal <font name='BodyBold'>effectif</font> qui peut dépasser 70\u00a0% "
        "dans certaines zones de revenu — bien au-delà du taux officiel.", S['body']))

    story.append(make_effective_marginal_chart())
    story.append(Spacer(1, 8))

    story.append(InfoBox('attention', 'ATTENTION — La zone SRG est un piège fiscal', [
        'Un retraité touchant le SRG qui retire 1\u202f000\u00a0$ de son FERR perd\u00a0: '
        '~150\u00a0$ d\'impôt + 500\u00a0$ de SRG récupéré + ~50\u00a0$ de crédit TPS réduit = '
        '<font name="BodyBold">700\u00a0$ de prélèvements sur 1\u202f000\u00a0$</font>. '
        'Taux effectif\u00a0: 70\u00a0%. C\'est pourquoi le CÉLI est crucial pour les revenus modestes\u00a0: '
        'il n\'affecte aucun de ces calculs.',
    ]))
    story.append(Spacer(1, 6))

    story.append(InfoBox('brief', 'EN BREF — Fiscalité retraite', [
        '• FERR/REER = le compte le plus imposé. Décaissez-le stratégiquement, pas par défaut.',
        '• CÉLI = souvent le compte le plus avantageux à préserver. Envisagez de le décaisser en dernier.',
        '• Dividendes = crédit intéressant, mais la majoration peut déclencher le clawback PSV.',
        '• Crédit pension de 2\u202f000\u00a0$ à 65+ = un avantage fiscal à ne pas oublier.',
        '• Taux marginal effectif réel (impôt + récupérations) peut dépasser 70\u00a0% — planifiez en conséquence.',
    ]))

    # ═══ CH 3 — PROTÉGER PSV ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("3", "Protéger votre PSV", "Le clawback — et comment l'éviter"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "La Pension de la Sécurité de la vieillesse (PSV) vaut 742\u00a0$/mois en 2026 pour les 65-74 ans "
        "(817\u00a0$/mois pour les 75+). Sur 25 ans, c'est plus de 220\u202f000\u00a0$. "
        "Mais si votre revenu net dépasse 95\u202f323\u00a0$, le gouvernement récupère 15\u00a0¢ par dollar au-dessus. "
        "Autour de 155\u202f000\u00a0$, votre PSV tombe à zéro.", S['body_intro']))

    story.append(make_oas_clawback_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Cinq stratégies pour protéger votre PSV", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>1. Meltdown REER avant 72.</font> Envisagez de retirer graduellement de votre REER entre 60 et 72 ans "
        "pour éviter des retraits FERR forcés qui gonflent votre revenu à 72+. C'est souvent la stratégie la plus avantageuse "
        "pour les gros REER (détails au chapitre 8).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2. Privilégiez le CÉLI.</font> Les retraits du CÉLI ne comptent pas dans le calcul du revenu net "
        "pour la PSV. Si vous avez le choix entre REER et CÉLI en accumulation, considérez le CÉLI "
        "si vous prévoyez un revenu élevé à la retraite.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3. Fractionnez le revenu de pension.</font> Si votre conjoint a un revenu plus bas, "
        "transférez-lui jusqu'à 50\u00a0% de votre revenu de pension admissible. Deux revenus de 70\u202f000\u00a0$ valent "
        "mieux qu'un seul de 140\u202f000\u00a0$ (chapitre 5).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>4. Reportez la PSV à 70.</font> Si vous avez d'autres revenus suffisants entre 65 et 70, "
        "reporter la PSV augmente la rente de 36\u00a0% — et peut vous permettre de compléter le meltdown REER "
        "avant que la PSV ne s'ajoute à votre revenu imposable.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>5. Surveillez les dividendes.</font> La majoration des dividendes canadiens gonfle "
        "votre revenu net même si l'impôt réel est réduit par le crédit. En zone de clawback, "
        "les gains en capital (inclusion à 50\u00a0%) sont souvent préférables aux dividendes.", S['body']))

    story.append(InfoBox('dollars', 'EN DOLLARS — Le coût du clawback', [
        'Revenu net de 115\u202f000\u00a0$ à 65 ans. Dépassement du seuil\u00a0: 19\u202f677\u00a0$ × 15\u00a0% = '
        '<font name="BodyBold">2\u202f952\u00a0$/an de PSV perdue</font>. '
        'Sur 25 ans (avec indexation)\u00a0: plus de <font name="BodyBold">85\u202f000\u00a0$ de prestations perdues</font>. '
        'L\'impôt marginal réel dans la zone de clawback = votre taux provincial/fédéral + 15\u00a0% = souvent plus de 60\u00a0%.',
    ]))

    # ═══ CH 4 — ÂGE RRQ ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("4", "Choisir votre âge RRQ/RPC", "60, 65 ou 70 — une décision permanente"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "La décision de quand commencer votre RRQ/RPC est irréversible. "
        "À 60 ans, vous recevez 36\u00a0% de moins qu'à 65 — pour le reste de votre vie. "
        "À 70, vous recevez 42\u00a0% de plus. La bonne réponse dépend de votre santé, "
        "de vos autres revenus et de votre espérance de vie.", S['body_intro']))

    story.append(make_rrq_timing_table())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Le point mort — combien de temps pour récupérer?", S['h2']))
    story.append(Paragraph(
        "Si vous reportez de 65 à 70, vous renoncez à 5 ans de rente (~90\u202f000\u00a0$ cumulés à la rente maximale). "
        "En échange, chaque mois de rente est 42\u00a0% plus élevé. Le point mort se situe autour de 82 ans\u00a0: "
        "si vous vivez au-delà, le report est gagnant. L'espérance de vie d'un Canadien de 65 ans "
        "est d'environ 87 ans (homme) et 89 ans (femme). La probabilité de dépasser 82 ans est élevée.", S['body']))

    story.append(Paragraph("Quand demander tôt fait du sens", S['h2']))
    story.append(Paragraph(
        "Problèmes de santé réduisant l'espérance de vie. Besoin immédiat de liquidités et absence "
        "d'autres sources de revenus. Conjoint survivant avec faible revenu — la rente du conjoint "
        "est basée sur votre rente, pas sur le maximum. Dans ces cas, recevoir moins mais plus longtemps "
        "a moins de valeur qu'un revenu immédiat.", S['body']))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'L\'onglet <font name="BodyBold">Optimiseur</font> teste automatiquement les 11 combinaisons d\'âge RRQ et PSV (60 à 70) '
        'et affiche celle qui maximise votre taux de succès Monte Carlo. Le résultat n\'est pas une moyenne — '
        'c\'est le choix optimal <font name="BodyBold">pour votre situation spécifique</font>.',
    ]))

    # ═══ CH 5 — FRACTIONNEMENT ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("5", "Le fractionnement du revenu", "Diviser pour économiser — en couple"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "À partir de 65 ans, vous pouvez transférer jusqu'à 50\u00a0% de votre revenu de pension admissible "
        "à votre conjoint sur vos déclarations de revenus. Le revenu de pension admissible inclut\u00a0: "
        "les retraits FERR, les rentes de pension DB et certaines rentes viagères. "
        "Le RRQ, la PSV et les retraits REER (avant conversion en FERR) ne sont pas admissibles.", S['body_intro']))

    story.append(make_splitting_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Pourquoi c'est si puissant", S['h2']))
    story.append(Paragraph(
        "Le système fiscal canadien est progressif\u00a0: plus vous gagnez, plus le taux marginal augmente. "
        "Si un conjoint est à 45\u00a0% et l'autre à 27\u00a0%, fractionnez 50\u00a0% de la pension du premier vers le second. "
        "Chaque dollar transféré passe d'un palier de 45\u00a0% à un palier de 27\u00a0% — c'est une économie de 18\u00a0¢ par dollar. "
        "Sur un revenu de pension de 60\u202f000\u00a0$, le fractionnement de 30\u202f000\u00a0$ peut économiser "
        "entre 3\u202f000 et 5\u202f000\u00a0$ d'impôt par année.", S['body']))

    story.append(InfoBox('quebec', 'QUÉBEC — Le fractionnement fonctionne aussi au provincial', [
        'Revenu Québec accepte le fractionnement du revenu de pension aux mêmes conditions que le fédéral. '
        'Le formulaire fédéral T1032 et le relevé provincial TP-1012.A s\'appliquent simultanément. '
        'L\'économie est donc double\u00a0: fédérale et provinciale.',
    ]))

    story.append(Spacer(1, 6))
    story.append(InfoBox('attention', 'ATTENTION — Ce que vous ne pouvez pas fractionner', [
        'Le RRQ/RPC n\'est <font name="BodyBold">pas</font> admissible au fractionnement de pension (il existe un partage RRQ séparé, '
        'mais c\'est un mécanisme différent et permanent). Les retraits REER avant 65 ans ne sont pas admissibles non plus. '
        'Et le CÉLI n\'a pas besoin d\'être fractionné — il est déjà libre d\'impôt.',
    ]))

    # ═══ CH 6 — FRAIS ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("6", "Les frais de gestion", "Le coût invisible qui gruge votre patrimoine"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Les frais de gestion (MER — Management Expense Ratio) sont le prédateur silencieux de votre retraite. "
        "Un fonds commun canadien moyen facture environ 2,2\u00a0% par année. Ça semble petit. "
        "Sur 30 ans, c'est la différence entre prendre votre retraite à 60 ans ou à 67.", S['body_intro']))

    story.append(make_fee_impact_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Pourquoi 2\u00a0% détruit votre patrimoine", S['h2']))
    story.append(Paragraph(
        "Les frais sont prélevés sur le solde total, chaque année, indépendamment du rendement. "
        "Si le marché fait 7\u00a0% et vos frais sont de 2,2\u00a0%, votre rendement net est de 4,8\u00a0%. "
        "Mais l'impact n'est pas de 2\u00a0% — il est composé. "
        "Sur 200\u202f000\u00a0$ investis pendant 30 ans à 6\u00a0% brut\u00a0: un FNB à 0,20\u00a0% produit 578\u202f000\u00a0$, "
        "un fonds à 2,20\u00a0% produit 349\u202f000\u00a0$. La différence de 229\u202f000\u00a0$ représente le coût cumulatif des frais de gestion.", S['body']))

    story.append(Paragraph("Options à faibles frais au Canada", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>FNB indiciels</font> — Offerts par plusieurs fournisseurs (Vanguard, iShares, BMO, etc.). MER de 0,05\u00a0% à 0,25\u00a0%. "
        "Requiert un compte de courtage (par exemple Questrade, Wealthsimple Trade, Disnat, etc.). "
        "<font name='BodyBold'>Portefeuilles tout-en-un</font> — Par exemple VBAL, XBAL, VGRO (MER ~0,24\u00a0%). Un seul FNB, "
        "rééquilibrage automatique. Peut convenir si vous ne voulez pas gérer votre allocation. "
        "<font name='BodyBold'>Robots-conseillers</font> — Par exemple Wealthsimple Invest, Questwealth (~0,5\u00a0% tout inclus). "
        "Gestion automatisée, contribution automatique.", S['body']))

    story.append(InfoBox('brief', 'EN BREF — Frais de gestion', [
        '• MER de 2\u00a0% vs 0,2\u00a0% = <font name="BodyBold">229\u202f000\u00a0$ de différence</font> sur 30 ans (200K investi).',
        '• À titre d\'exemple, les FNB tout-en-un (comme VBAL, VGRO ou XGRO) offrent une solution simple à faibles frais.',
        '• Les frais sont intégrés aux produits — pas facturés séparément. Cela peut créer un conflit d\'intérêt implicite entre votre institution financière et vous.',
    ]))

    # ═══ CH 7 — RISQUES ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("7", "Les risques que personne ne mentionne", "Longévité, inflation, séquence — les trois ennemis invisibles"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Les plans financiers échouent rarement à cause d'un krach boursier unique. "
        "Ils échouent à cause de risques lents, cumulatifs et souvent ignorés. "
        "Trois d'entre eux méritent votre attention immédiate.", S['body_intro']))

    story.append(Paragraph("1. Le risque de longévité", S['h2']))
    story.append(Paragraph(
        "Vous planifiez pour 85 ans, mais vous vivez jusqu'à 97. C'est 12 années de dépenses imprévues. "
        "Un Canadien de 65 ans a environ 30\u00a0% de chance de vivre jusqu'à 90 ans et 10\u00a0% de chance "
        "de dépasser 95. Pour un couple, la probabilité qu'au moins un des deux dépasse 90 est supérieure à 50\u00a0%. "
        "Le report du RRQ à 70 est une forme d'assurance longévité\u00a0: la rente, indexée à l'inflation, "
        "augmente avec chaque année de report et dure toute votre vie.", S['body']))

    story.append(Paragraph("2. Le risque d'inflation", S['h2']))
    story.append(Paragraph(
        "Une inflation de 3\u00a0% par année réduit votre pouvoir d'achat de moitié en 24 ans. "
        "Les dépenses de santé augmentent typiquement plus vite que l'inflation générale. "
        "La PSV est indexée (protégée). Le RRQ est indexé. Mais vos retraits REER, CÉLI et NR ne le sont pas — "
        "c'est à vous de prévoir que vos retraits devront augmenter avec le temps.", S['body']))

    story.append(Paragraph("3. Le risque de séquence des rendements", S['h2']))
    story.append(Paragraph(
        "Un krach de 30\u00a0% l'année de votre retraite est catastrophique. Le même krach 10 ans plus tard, "
        "beaucoup moins. Pourquoi? Parce qu'en début de retraite, vous retirez d'un portefeuille en chute — "
        "chaque retrait amplifie la perte. C'est le <font name='BodyBold'>risque de séquence</font>.", S['body']))

    story.append(make_sequence_risk_chart())
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "Protection\u00a0: gardez 2 à 3 ans de dépenses en liquidités ou obligations à court terme "
        "pour ne jamais vendre d'actions en période de baisse. C'est votre «\u00a0coussin de décaissement\u00a0» — "
        "l'équivalent retraite du coussin d'urgence.", S['body']))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'Votre Bilan teste automatiquement <font name="BodyBold">6 scénarios de stress</font>\u00a0: '
        'krach immédiat (-40\u00a0%), inflation élevée (5\u00a0%), stagflation, décennie perdue, '
        'et longévité extrême (100 ans). L\'onglet <font name="BodyBold">Stress Tests</font> montre si votre plan survit aux pires scénarios historiques.',
    ]))

    # ════════════════════════════════════════
    #  PARTIE 301 — BONUS AVANCÉ
    # ════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionDivider("BONUS 301 — Stratégies avancées", "Pour ceux qui veulent chaque dollar d'optimisation", PURPLE))
    story.append(Spacer(1, 10))

    story.append(InfoBox('expert', 'QUI EST CONCERNÉ PAR LE 301?', [
        'Les chapitres 8 à 11 s\'adressent aux situations patrimoniales complexes\u00a0: '
        'REER de plus de 500\u202f000\u00a0$, entreprise incorporée (CCPC), immeubles locatifs ou Smith Manoeuvre. '
        'Si ce n\'est pas votre cas, les chapitres 1 à 7 couvrent l\'essentiel de votre optimisation.',
    ]))
    story.append(Spacer(1, 8))

    story.append(InfoBox('saviez', 'UNE NOTE SUR LA PROFONDEUR', [
        'Chacun des sujets abordés dans cette section — la fiscalité immobilière, '
        'la planification corporative, le meltdown REER, les stratégies de retrait dynamiques — '
        'pourrait remplir un livre entier. Ce constat s\'applique d\'ailleurs à plusieurs chapitres '
        'de la partie 201 également\u00a0: le fractionnement, la protection de la PSV et les frais de gestion '
        'sont des domaines riches et nuancés.',
        'Notre objectif ici n\'est pas de remplacer un fiscaliste ou un planificateur financier. '
        'C\'est de vous donner le cadre décisionnel — les bonnes questions, les bons réflexes, '
        'les pièges à connaître — pour que vos conversations avec vos professionnels soient '
        'plus productives et que votre Bilan BuildFi prenne tout son sens.',
    ]))
    story.append(Spacer(1, 14))

    # ═══ CH 8 — MELTDOWN ═══
    story.append(ChapterHeader("8", "Le meltdown REER en détail", "Vidange stratégique — le levier le plus puissant"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Le «\u00a0meltdown\u00a0» REER consiste à retirer volontairement de votre REER avant l'âge de 72 ans "
        "pour rester dans un palier d'imposition bas et éviter les retraits FERR forcés qui pourraient "
        "déclencher le clawback PSV. C'est contre-intuitif — on vous a dit toute votre vie de ne pas "
        "toucher au REER. Mais en décaissement, les règles changent.", S['body_intro']))

    story.append(make_meltdown_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Comment ça fonctionne — étape par étape", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 1\u00a0:</font> Identifiez votre palier d'imposition cible. Au Québec en 2026, "
        "le premier palier fédéral se termine à 57\u202f375\u00a0$. En combinant fédéral et provincial, "
        "le taux marginal reste autour de 27 à 32\u00a0% sous ce seuil.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 2\u00a0:</font> Calculez votre revenu fixe (RRQ, pension DB, emploi à temps partiel). "
        "L'espace résiduel dans le palier cible est votre «\u00a0budget de meltdown\u00a0» annuel.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 3\u00a0:</font> Retirez ce montant du REER chaque année. Déposez le net dans votre CÉLI "
        "(si vous avez de l'espace) ou dans un compte NR.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 4\u00a0:</font> À 72, votre REER converti en FERR sera beaucoup plus petit — "
        "les retraits obligatoires ne gonfleront plus votre revenu au-delà du seuil PSV.", S['body']))

    story.append(InfoBox('expert', 'STRATÉGIE AVANCÉE — Meltdown agressif pré-RRQ', [
        'Si vous prenez votre retraite avant 60 ans et que vos revenus sont très bas, vous pouvez remplir '
        'les paliers fiscaux les plus bas avec des retraits REER massifs à un taux d\'imposition de 15 à 20\u00a0%. '
        'C\'est le moment idéal\u00a0: aucun RRQ, aucune PSV ne s\'ajoute à votre revenu. '
        'BuildFi appelle cette fenêtre la <font name="BodyBold">«\u00a0zone dorée du meltdown\u00a0»</font> — entre la retraite et 65 ans.',
    ]))

    story.append(InfoBox('attention', 'ATTENTION — Quand le meltdown n\'est pas optimal', [
        'Si votre REER est modeste (moins de 200\u202f000\u00a0$), les retraits FERR obligatoires à 72+ ne dépasseront '
        'probablement pas le seuil PSV. Le meltdown ne vaut alors pas la complexité. '
        'BuildFi calcule automatiquement si le meltdown améliore votre résultat — consultez l\'onglet Optimiseur.',
    ]))

    # ═══ CH 9 — GUARDRAILS ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("9", "Guardrails — dépenser sans tomber", "Ajuster vos retraits en fonction du marché"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "La règle du 4\u00a0% est connue\u00a0: retirez 4\u00a0% de votre portefeuille la première année, "
        "puis ajustez pour l'inflation. Simple, mais rigide. "
        "Elle est basée sur des données historiques américaines (1926-1995) — "
        "des décennies où les taux obligataires étaient plus élevés et les valorisations boursières plus basses qu'aujourd'hui. "
        "Plusieurs chercheurs estiment qu'un taux sécuritaire actuel se situe plutôt entre 3,3\u00a0% et 3,8\u00a0%. "
        "Si le marché chute de 40\u00a0% et que "
        "vous retirez le même montant, vous videz votre portefeuille en accéléré. "
        "Les <font name='BodyBold'>guardrails</font> sont une approche dynamique\u00a0: "
        "vos retraits s'adaptent à la performance du marché.", S['body_intro']))

    story.append(Paragraph("Le principe des guardrails", S['h2']))
    story.append(Paragraph(
        "Définissez une bande autour de votre taux de retrait cible. Par exemple, cible de 4,5\u00a0%, "
        "plancher à 3,5\u00a0%, plafond à 5,5\u00a0%. "
        "Si votre portefeuille performe bien et que votre taux effectif tombe sous 3,5\u00a0%, "
        "vous augmentez vos retraits (vous pouvez dépenser plus). "
        "Si le marché chute et que votre taux dépasse 5,5\u00a0%, vous réduisez temporairement "
        "(vous coupez les dépenses discrétionnaires). Cette mécanique simple protège votre capital "
        "tout en vous permettant de profiter des bonnes années.", S['body']))

    story.append(InfoBox('dollars', 'EN DOLLARS — Guardrails en action', [
        'Portefeuille de 800\u202f000\u00a0$. Retrait initial de 36\u202f000\u00a0$/an (4,5\u00a0%). '
        'Après un krach de 25\u00a0%, portefeuille à 600\u202f000\u00a0$. Taux effectif\u00a0: 6,0\u00a0% (au-dessus du plafond de 5,5\u00a0%). '
        'Action\u00a0: réduire le retrait à 33\u202f000\u00a0$/an (5,5\u00a0% × 600K). '
        'Quand le portefeuille remonte à 800K+, le retrait revient à la normale.',
    ]))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'L\'onglet <font name="BodyBold">Guardrails</font> dans votre Bilan Expert calcule automatiquement '
        'les seuils haut et bas optimaux en fonction de votre taux de succès Monte Carlo. '
        'C\'est un système de «\u00a0pilote automatique\u00a0» pour vos retraits.',
    ]))

    # ═══ CH 10 — IMMOBILIER ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("10", "L'immobilier dans le plan de retraite", "DPA, Smith Manoeuvre et timing de vente"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Un immeuble locatif est un actif de retraite puissant — revenu passif, appréciation, avantages fiscaux. "
        "Mais c'est aussi un actif complexe au moment du décaissement. La déduction pour amortissement (DPA) "
        "que vous avez réclamée pendant des années devra être «\u00a0remboursée\u00a0» au fisc lors de la vente. "
        "Le moment où vous vendez peut facilement représenter une différence de "
        "<font name='BodyBold'>15\u202f000 à 40\u202f000\u00a0$</font> en impôt — pour le même immeuble.", S['body_intro']))

    story.append(Paragraph("La DPA — un avantage fiscal à double tranchant", S['h2']))
    story.append(Paragraph(
        "La déduction pour amortissement (DPA) réduit votre revenu imposable chaque année, typiquement à un taux "
        "de 4\u00a0% du solde dégressif (catégorie 1). Sur un immeuble de 500\u202f000\u00a0$ (bâtiment seulement, "
        "excluant le terrain), c'est environ 20\u202f000\u00a0$ de déduction la première année. "
        "Mais à la vente, toute la DPA accumulée est «\u00a0récupérée\u00a0» et imposée comme revenu ordinaire — "
        "pas comme gain en capital. C'est-à-dire à 100\u00a0% d'inclusion, au taux marginal complet.", S['body']))

    story.append(InfoBox('dollars', 'EN DOLLARS — L\'impact de la récupération DPA', [
        'Immeuble acheté 400\u202f000\u00a0$ (bâtiment). DPA réclamée sur 15 ans\u00a0: ~120\u202f000\u00a0$. '
        'Vendu 550\u202f000\u00a0$. Gain en capital\u00a0: 150\u202f000\u00a0$ (inclusion 50\u00a0% = 75\u202f000\u00a0$ imposable). '
        'Récupération DPA\u00a0: 120\u202f000\u00a0$ imposable à 100\u00a0%. '
        '<font name="BodyBold">Total imposable l\'année de la vente\u00a0: 195\u202f000\u00a0$</font> — '
        'suffisant pour perdre votre PSV au complet et atteindre le palier de 50\u00a0%+.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Quand vendre — le timing change tout", S['h2']))
    story.append(make_property_sale_timing())
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Vendre avant la retraite (quand votre seul revenu est le salaire) garde le gain en capital dans "
        "un palier prévisible. Vendre après, quand RRQ + PSV + FERR s'additionnent, propulse votre revenu "
        "dans les paliers supérieurs et déclenche le clawback PSV. La stratégie optimale\u00a0: "
        "planifiez la vente dans une année de «\u00a0creux fiscal\u00a0» — entre la fin de l'emploi et le début "
        "du RRQ, ou dans la fenêtre de meltdown REER.", S['body']))

    story.append(InfoBox('bon', 'BON À SAVOIR — La provision pour gain en capital', [
        'Depuis juin 2024, le taux d\'inclusion des gains en capital passe de 50\u00a0% à 66,67\u00a0% '
        'au-delà de 250\u202f000\u00a0$ de gains annuels pour les particuliers. Pour les sociétés, '
        'le taux est de 66,67\u00a0% dès le premier dollar. Planifiez les ventes d\'immeubles '
        'en conséquence — étaler les dispositions sur plusieurs années peut être avantageux.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("La Smith Manoeuvre — convertir l'hypothèque en déduction", S['h2']))
    story.append(Paragraph(
        "La Smith Manoeuvre est une stratégie qui transforme votre dette hypothécaire non déductible "
        "en dette déductible. Le mécanisme est simple en théorie, mais exige de la discipline.", S['body']))

    story.append(make_smith_manoeuvre_diagram())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Le mécanisme en 4 étapes", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>1.</font> Vous remboursez votre hypothèque normalement. Chaque paiement libère "
        "de l'espace sur votre marge hypothécaire (HELOC) rattachée à la propriété.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2.</font> Vous réempruntez immédiatement sur la HELOC le même montant que le capital "
        "remboursé.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3.</font> Vous investissez cet argent dans des placements admissibles qui produisent "
        "un revenu imposable (actions canadiennes à dividendes, FNB de dividendes).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>4.</font> Les intérêts de la HELOC deviennent déductibles d'impôt (l'emprunt sert à "
        "gagner un revenu). Avec le temps, votre hypothèque non déductible diminue et votre dette déductible augmente.", S['body']))

    story.append(InfoBox('attention', 'ATTENTION — Risques de la Smith Manoeuvre', [
        'Vous augmentez votre exposition au marché avec du levier. Si les marchés chutent de 30\u00a0%, '
        'vous devez toujours les intérêts sur votre HELOC. '
        'La déductibilité exige que les placements visent un revenu — pas seulement un gain en capital. '
        'L\'ARC peut contester la déduction si le lien entre l\'emprunt et le revenu n\'est pas clair. '
        'Cette stratégie convient aux investisseurs avec un horizon long (10+ ans) et une tolérance au risque élevée.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("HELOC comme réserve de dernier recours", S['h2']))
    story.append(Paragraph(
        "En période de décaissement, la HELOC peut servir de «\u00a0tampon\u00a0» pour éviter de vendre "
        "des placements en baisse. Si le marché chute et que vous avez besoin de liquidités, "
        "emprunter temporairement sur votre HELOC (à 7-8\u00a0%) peut être préférable à cristalliser "
        "une perte de 30\u00a0% sur vos placements. BuildFi modélise cette option "
        "comme dernier recours dans la séquence de décaissement.", S['body']))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'Chaque propriété est modélisée individuellement\u00a0: hypothèque, HELOC, DPA, Smith Manoeuvre, '
        'revenus locatifs nets et simulation de vente. L\'onglet <font name="BodyBold">Immobilier</font> '
        'montre l\'impact fiscal de chaque scénario de disposition — et le meilleur moment pour vendre.',
    ]))

    # ═══ CH 11 — ENTREPRENEUR ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("11", "L'entreprise incorporée et la retraite", "CCPC, extraction et optimisation"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Votre société privée sous contrôle canadien (SPCC/CCPC) est un véhicule de report d'impôt "
        "pendant votre vie active. Mais à la retraite, chaque dollar doit en sortir — "
        "et la façon dont vous l'extrayez détermine combien le fisc garde. "
        "C'est un jeu d'échecs entre le taux corporatif, le taux personnel, le RRQ, la PSV "
        "et l'intégration fiscale.", S['body_intro']))

    story.append(Paragraph("Le report d'impôt — pourquoi ça change le calcul", S['h2']))
    story.append(Paragraph(
        "Le revenu actif d'une CCPC admissible à la DPE est imposé à environ 12,2\u00a0% au Québec "
        "(combiné fédéral/provincial) sur les premiers 500\u202f000\u00a0$ de revenu actif. "
        "Comparé au taux personnel qui peut atteindre 53\u00a0%, c'est un report massif. "
        "L'argent reste dans la société et peut être investi. Mais attention\u00a0: "
        "ce n'est qu'un <font name='BodyBold'>report</font>, pas une économie permanente. "
        "Au moment du retrait (salaire ou dividende), l'impôt personnel s'applique.", S['body']))

    story.append(Paragraph("Le grind de la DPE — le piège des 50\u202f000\u00a0$", S['h2']))
    story.append(Paragraph(
        "Si votre société génère plus de 50\u202f000\u00a0$ de revenu de placement passif par année "
        "(intérêts, dividendes, gains en capital), le plafond de la DPE est réduit progressivement. "
        "À 150\u202f000\u00a0$ de revenu passif, la DPE tombe à zéro — votre taux corporatif passe "
        "d'environ 12\u00a0% à environ 26\u00a0% sur le revenu actif. "
        "C'est le «\u00a0grind\u00a0». Concrètement, chaque dollar de revenu passif au-dessus de 50\u202f000\u00a0$ "
        "vous coûte 5\u00a0$ de DPE perdue. L'impact peut dépasser le rendement du placement.", S['body']))

    story.append(InfoBox('attention', 'ATTENTION — Le grind en dollars', [
        'Société avec 600\u202f000\u00a0$ en placements générant 5\u00a0% = 30\u202f000\u00a0$ de revenu passif. Pas de problème. '
        'Mais à 1,2\u00a0M$ en placements → 60\u202f000\u00a0$ de passif → perte de 50\u202f000\u00a0$ de DPE → '
        '<font name="BodyBold">~7\u202f000\u00a0$ d\'impôt corporatif supplémentaire par année</font> sur le revenu actif. '
        'Planifiez les extractions pour garder le passif sous le seuil.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Salaire vs dividende à la retraite", S['h2']))
    story.append(Paragraph(
        "La question classique prend une dimension différente à la retraite. Le choix n'est plus "
        "seulement fiscal — il affecte aussi le RRQ, la PSV et le SRG.", S['body']))

    story.append(make_salary_vs_dividend_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<font name='BodyBold'>Salaire</font> — Déductible pour la société. Cotise au RRQ (augmente votre rente future). "
        "Crée de l'espace REER. Imposé au taux marginal personnel. Aucune majoration — n'affecte pas "
        "la PSV au-delà du montant réel.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Dividende déterminé</font> — Versé à partir de revenus imposés au taux général corporatif. "
        "Majoré de 38\u00a0% pour le calcul du revenu imposable. Crédit d'impôt de 15,02\u00a0% fédéral. "
        "Taux effectif personnel souvent plus bas que le salaire — mais la majoration gonfle le revenu net "
        "et peut déclencher le clawback PSV.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Dividende ordinaire</font> — Versé à partir de revenus imposés au taux PME. "
        "Majoré de 15\u00a0%. Crédit plus faible. Taux effectif généralement plus élevé que le déterminé. "
        "Moins risqué pour la PSV grâce à la majoration plus basse.", S['body']))

    story.append(InfoBox('expert', 'STRATÉGIE AVANCÉE — L\'extraction en 3 couches', [
        '<font name="BodyBold">Couche 1\u00a0:</font> Salaire minimal (~15\u202f000\u00a0$) pour cotiser au RRQ et protéger vos droits. '
        'Génère ~2\u202f700\u00a0$ d\'espace REER.',
        '<font name="BodyBold">Couche 2\u00a0:</font> Dividendes en capital (CDC) — entièrement libres d\'impôt. '
        'Votre CDC se remplit à chaque gain en capital réalisé dans la société (50\u00a0% non imposable).',
        '<font name="BodyBold">Couche 3\u00a0:</font> Dividendes imposables pour combler le reste, en ciblant '
        'le seuil PSV de 95\u202f323\u00a0$ (revenu net incluant la majoration).',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Le compte IMRTD — l'impôt remboursable caché", S['h2']))
    story.append(Paragraph(
        "Quand votre société gagne du revenu de placement, elle paie un impôt plus élevé (~50\u00a0%) "
        "dont une partie est «\u00a0remboursable\u00a0» au moment de verser des dividendes. C'est le mécanisme "
        "d'IMRTD (impôt en main remboursable au titre de dividendes). Concrètement\u00a0: "
        "pour chaque 2,61\u00a0$ de dividende déterminé versé, la société récupère 1\u00a0$ d'IMRTD. "
        "C'est un incitatif à sortir l'argent — et un élément clé de la planification d'extraction.", S['body']))

    story.append(Paragraph("La liquidation — quand fermer la société", S['h2']))
    story.append(Paragraph(
        "À terme, le solde de votre société doit être extrait. Les options\u00a0: dividendes graduels (planifié), "
        "pipeline (transfert à une société de portefeuille), ou liquidation formelle. "
        "Le pipeline est une stratégie avancée qui convertit un dividende réputé en gain en capital — "
        "mais l'ARC l'a dans sa mire. Consultez un fiscaliste avant toute planification de pipeline.", S['body']))

    story.append(InfoBox('bon', 'CE QUE FAIT BUILDFI', [
        'L\'onglet <font name="BodyBold">Entreprise</font> projette votre solde corporatif année par année\u00a0: '
        'revenus actifs, placements passifs, dividendes versés, alerte de grind DPE. '
        'L\'<font name="BodyBold">Optimiseur de rémunération</font> teste les combinaisons salaire/dividende '
        'pour trouver l\'extraction qui maximise votre revenu net après impôt personnel et corporatif — '
        'en tenant compte du RRQ, de la PSV et de l\'espace REER.',
    ]))

    # ═══ ERREURS FRÉQUENTES 201 ═══
    story.append(Spacer(1, 22))
    story.append(Paragraph(
        '<font name="DisplayBold" size="18" color="#b91c1c">Les 5 erreurs de décaissement les plus coûteuses</font>', S['ch_title']))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Ces erreurs se comptent en dizaines de milliers de dollars. Elles sont fréquentes — "
        "et évitables avec une planification minimale.", S['body_intro']))

    erreurs_201 = [
        ("1. Prendre la RRQ à 60 ans sans analyse",
         "La réduction de 36\u00a0% est permanente. Si vous vivez jusqu'à 85 ans, reporter à 65 ou 70 ans "
         "peut représenter plus de 100\u202f000\u00a0$ de revenus supplémentaires à vie. "
         "La décision dépend de votre espérance de vie, de vos autres revenus et de votre besoin de liquidité — "
         "pas d'un «\u00a0j'en ai besoin maintenant\u00a0»."),
        ("2. Ignorer le clawback PSV",
         "Chaque dollar de revenu au-dessus de 95\u202f323\u00a0$ vous coûte 15\u00a0¢ de PSV récupérée — en plus "
         "de l'impôt normal. Sur 20 ans, la perte peut dépasser 85\u202f000\u00a0$. Les retraits FERR forcés à 72+ "
         "sont la cause la plus fréquente."),
        ("3. Décaisser le CÉLI en premier",
         "Le CÉLI est votre compte le plus précieux à la retraite — les retraits n'affectent ni votre impôt, "
         "ni votre PSV, ni votre SRG. Le toucher en premier est presque toujours sous-optimal. "
         "Décaissez le non enregistré et le REER d'abord."),
        ("4. Garder un portefeuille à 2\u00a0% de frais pendant 30 ans de retraite",
         "Sur un portefeuille de 500\u202f000\u00a0$, la différence entre 0,25\u00a0% et 2,20\u00a0% de frais "
         "représente plus de 350\u202f000\u00a0$ sur 30 ans. C'est l'équivalent de 5 années complètes de dépenses "
         "perdues en frais invisibles."),
        ("5. Ne pas fractionner le revenu de pension",
         "Un couple dont un seul conjoint a une pension peut économiser 3\u202f000 à 5\u202f000\u00a0$ d'impôt par année "
         "en transférant jusqu'à 50\u00a0% du revenu admissible. Formulaire T1032 (fédéral) + TP-1012.A (Québec). "
         "Aucun coût. Aucun risque. Juste un formulaire à remplir."),
    ]
    for title, desc in erreurs_201:
        story.append(Paragraph(
            f"<font name='BodyBold' color='#b91c1c'>{title}</font>", S['body']))
        story.append(Paragraph(desc, S['body']))
        story.append(Spacer(1, 4))

    # ════════════════════════════════════════
    #  FERMETURE
    # ════════════════════════════════════════
    story.append(Spacer(1, 22))
    story.append(GoldRule(CW-80, 1.5))
    story.append(Spacer(1, 12))
    story.append(PullQuote("L'optimisation n'est pas de la spéculation. C'est payer le bon montant d'impôt — pas un dollar de plus."))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Votre Bilan BuildFi applique ces stratégies", S['h2']))
    story.append(Paragraph(
        "Ce guide vous a donné le cadre conceptuel. Votre Bilan le transforme en plan chiffré, "
        "adapté à votre province, vos comptes, votre couple et vos propriétés.", S['body']))

    story.append(InfoBox('dollars', 'CE QUE VOTRE BILAN INTERMÉDIAIRE VOUS DONNE', [
        '<font name="BodyBold">Décaissement optimisé</font> — L\'ordre de retrait qui minimise votre impôt, année par année.',
        '<font name="BodyBold">Optimiseur RRQ/PSV</font> — Les meilleurs âges de demande pour votre situation.',
        '<font name="BodyBold">Impact des frais</font> — Combien vos frais actuels vous coûtent en dollars sur 30 ans.',
        '<font name="BodyBold">Stress tests</font> — Krachs, inflation, longévité\u00a0: votre plan résiste-t-il?',
        '<font name="BodyBold">Simulation Monte Carlo</font> — 5\u202f000 scénarios. Pas des moyennes — votre distribution complète.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ PRINCIPES BUILDFI ═══
    story.append(InfoBox('bon', 'Les 3 principes BuildFi', [
        '<font name="BodyBold">1. Sécurité avant rendement.</font> Un coussin d\'urgence solide vaut plus qu\'un rendement de 12\u00a0% sur un portefeuille fragile.',
        '<font name="BodyBold">2. Liquidité avant optimisation fiscale.</font> L\'argent accessible en cas d\'urgence passe avant la stratégie fiscale parfaite.',
        '<font name="BodyBold">3. Simplicité avant sophistication.</font> Un plan simple que vous suivez bat un plan complexe que vous abandonnez.',
    ]))

    story.append(Spacer(1, 14))
    story.append(GoldRule(CW - 60, 0.5))
    story.append(Spacer(1, 6))

    # ═══ SOURCES ═══
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Sources</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Agence du revenu du Canada (ARC)\u00a0: paliers d'imposition fédéraux 2026, crédit pour revenu de pension, "
        "règles FERR, DPA catégorie 1 (4\u00a0% dégressif), règles IMRTD, seuils de grind DPE, "
        "taux d'inclusion des gains en capital (50\u00a0%/66,67\u00a0%). "
        "Service Canada\u00a0: montants PSV, seuils de récupération Q1\u00a02026. "
        "Retraite Québec\u00a0: ajustements actuariels RRQ 60/65/70, rente maximale 2026. "
        "Revenu Québec\u00a0: paliers provinciaux 2026, taux combinés corporatifs PME (12,2\u00a0%), "
        "crédit pour fractionnement, majoration des dividendes. "
        "Morningstar Canada\u00a0: frais de gestion moyens (MER) des fonds canadiens. "
        "Vanguard Canada\u00a0: MER des FNB indiciels (VBAL, VGRO). "
        "Guyton-Klinger (2006)\u00a0: méthodologie des guardrails de retrait dynamique. "
        "Fraser Smith (2002)\u00a0: Smith Manoeuvre — mécanisme et cadre légal. "
        "Association canadienne des compagnies d'assurances de personnes (CLHIA)\u00a0: tables de mortalité CPM 2023.", S['disclaimer']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Avis important</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Ce guide est fourni à titre informatif et éducatif seulement. Il ne constitue en aucun cas "
        "un conseil financier, fiscal, juridique ou de placement personnalisé. Les stratégies décrites "
        "(meltdown REER, fractionnement, Smith Manoeuvre, DPA, extraction corporative, pipeline) comportent des risques "
        "et des implications fiscales qui varient selon votre situation. Les chiffres et seuils "
        "mentionnés sont basés sur les données disponibles pour l'année fiscale 2026 et pourraient "
        "changer. Consultez un planificateur financier certifié (Pl.\u00a0Fin.), un fiscaliste ou un "
        "comptable professionnel agréé (CPA) avant de mettre en œuvre toute stratégie avancée.", S['disclaimer']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("© 2026 BuildFi  •  buildfi.ca  •  Tous droits réservés.",
        ParagraphStyle('cr', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, alignment=TA_CENTER)))

    doc.build(story)
    return path

if __name__ == "__main__":
    p = build()
    print(f"Generated: {p}")
