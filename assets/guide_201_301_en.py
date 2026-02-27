#!/usr/bin/env python3
"""
BuildFi — Guide 201 + Bonus 301 EN
201: Optimize Your Retirement — Intermediate Strategies
301: Mastering the Levers — Advanced Strategies (Bonus)
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
        'didyouknow':    (MARINE_BG, MARINE, MARINE),
        'caution': (BRICK_BG,  BRICK,  BRICK),
        'goodtoknow':       (FOREST_BG, FOREST, FOREST),
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
        return self.BOX_CFG.get(self.box_type, self.BOX_CFG['didyouknow'])

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
        p = P(f'<i>\u201c{self.text}\u201d</i>', S['pullquote'])
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
    d.add(String(CW/2, 92, "Conventional vs RRSP Meltdown — Tax Impact", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    # Row 1 - Conventional
    y1 = 58
    d.add(String(0, y1+4, "Conventional", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw * 0.85
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "Forced RRIF at 72  •  Marginal rate ~45%  •  OAS clawback", fontSize=7.5, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    # Row 2 - Meltdown
    y2 = 28
    d.add(String(0, y2+4, "Optimized meltdown", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * 0.45
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "Smoothed withdrawals 60-72  •  Rate ~30%  •  OAS protected", fontSize=7.5, fontName='Body', fillColor=FOREST))
    # Savings callout
    d.add(String(CW/2, 6, "Estimated potential savings*: $40,000 to $120,000 over 25 years", fontSize=8.5, fontName='BodyBold', fillColor=GOLD, textAnchor='middle'))
    return d


def make_withdrawal_order():
    """Optimal withdrawal order cascade"""
    d = Drawing(CW, 170)
    box_w, box_h = 320, 22
    x0 = (CW - box_w) / 2
    steps = [
        ("1. Non-registered account (NR)", TEXT_MED),
        ("2. RRSP / RRIF (controlled meltdown)", BRICK),
        ("3. Pension / Annuities", MARINE),
        ("4. TFSA (last resort)", FOREST),
    ]
    y_start = 138
    d.add(String(CW/2, 162, "Optimal withdrawal order — Minimize lifetime tax", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
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
    d.add(String(safe_end/2, bar_y+4, "Full OAS  •  < $95,323", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(Rect(safe_end, bar_y, claw_end-safe_end, bar_h, fillColor=GOLD, strokeColor=None))
    d.add(String((safe_end+claw_end)/2, bar_y+4, "Clawback 15¢/$", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(Rect(claw_end, bar_y, CW-claw_end, bar_h, fillColor=BRICK, strokeColor=None))
    d.add(String((claw_end+CW)/2, bar_y+4, "0 $", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Labels
    d.add(String(safe_end, 10, "95 323 $", fontSize=7.5, fontName='Mono', fillColor=GOLD, textAnchor='middle'))
    d.add(String(claw_end, 10, "~155 000 $", fontSize=7.5, fontName='Mono', fillColor=BRICK, textAnchor='middle'))
    d.add(String(CW/2, 56, "OAS Clawback Zone 2026 — Net Income", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d


def make_tax_bracket_chart():
    """Federal + provincial combined marginal rates"""
    d = Drawing(CW, 95)
    lw = 120; bw = CW - lw - 10
    d.add(String(CW/2, 88, "Combined Marginal Rate (Federal + Quebec) — 2026", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
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
    d.add(String(CW/2, 138, "True Effective Marginal Rate — Cascading Effects", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 125
    bw = CW - lw - 50
    max_rate = 82

    scenarios = [
        ("Employee $80K", 100, [("Tax", 32.5, MARINE)]),
        ("Retiree $100K", 80, [("Tax", 37.1, MARINE), ("OAS 15%", 15.0, BRICK)]),
        ("Retiree $22K", 60, [("Tax", 15.0, MARINE), ("GIS 50%", 50.0, BRICK), ("GST", 5.0, HexColor('#e8a040'))]),
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
    d.add(String(lw+14, 6, "Tax", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+55, 5, 10, 8, fillColor=BRICK, strokeColor=None))
    d.add(String(lw+69, 6, "Clawback (OAS, GIS)", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+195, 5, 10, 8, fillColor=HexColor('#e8a040'), strokeColor=None))
    d.add(String(lw+209, 6, "Lost GST credit", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

    return d


def make_fee_impact_chart():
    """MER impact over 30 years"""
    d = Drawing(CW, 90)
    lw = 130; bw = CW - lw - 10
    d.add(String(CW/2, 82, "Management Fee (MER) Impact over 30 Years — $200,000 Invested", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    items = [
        ("ETF 0.20%", 578000, FOREST),
        ("Robo 0.50%", 523000, GOLD),
        ("Fund 2.20%", 349000, BRICK),
    ]
    max_val = 578000
    for i, (label, val, col) in enumerate(items):
        y = 50 - i * 22
        d.add(String(0, y+4, label, fontSize=8.5, fontName='BodyBold', fillColor=col))
        bar_w = val / max_val * bw
        d.add(Rect(lw, y, bar_w, 16, fillColor=col, strokeColor=None, rx=3, ry=3))
        d.add(String(lw + bar_w + 6, y+3, f"{val:,} $".replace(",", " "), fontSize=8, fontName='Mono', fillColor=col))
    d.add(String(CW/2, 0, "Difference ETF vs active funds: $229,000", fontSize=8.5, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    return d


def make_splitting_chart():
    """Pension income splitting benefit"""
    d = Drawing(CW, 80)
    lw = 140; bw = CW - lw - 10
    d.add(String(CW/2, 72, "Income Splitting — Couple 65+, $60,000 pension", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    y1 = 40
    d.add(String(0, y1+4, "Without splitting", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw * 0.75
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "One taxpayer taxed  •  High marginal rate", fontSize=7.5, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    y2 = 12
    d.add(String(0, y2+4, "With splitting", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * 0.45
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "50% transferred to spouse  •  2 low brackets used", fontSize=7.5, fontName='Body', fillColor=FOREST))
    return d


def make_sequence_risk_chart():
    """Two retirees, same average return, different sequences — dramatic difference"""
    d = Drawing(CW, 140)
    d.add(String(CW/2, 132, "Same 6% average return — reversed sequences", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 115
    bw = CW - lw - 80

    # Retiree A: bad years first
    y1 = 94
    d.add(String(0, y1+8, "Retiree A", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    d.add(String(0, y1-4, "(crash at the start)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    # Mini sequence bars showing returns
    seq_a = [-25, -10, 5, 12, 18, 20, 15, 10, 8, 7]
    bar_w = bw / len(seq_a)
    for j, ret in enumerate(seq_a):
        col = BRICK if ret < 0 else FOREST_BG
        h = abs(ret) / 25 * 18
        d.add(Rect(lw + j * bar_w, y1 + (18-h)/2, bar_w-1, h, fillColor=col, strokeColor=None))
    d.add(String(lw + bw + 6, y1+8, "Balance at 85:", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(String(lw + bw + 6, y1-4, "180 000 $", fontSize=10, fontName='BodyBold', fillColor=BRICK))

    # Retiree B: good years first
    y2 = 42
    d.add(String(0, y2+8, "Retiree B", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    d.add(String(0, y2-4, "(crash at the end)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    seq_b = [20, 18, 15, 12, 10, 8, 7, 5, -10, -25]
    for j, ret in enumerate(seq_b):
        col = BRICK if ret < 0 else FOREST_BG
        h = abs(ret) / 25 * 18
        d.add(Rect(lw + j * bar_w, y2 + (18-h)/2, bar_w-1, h, fillColor=col, strokeColor=None))
    d.add(String(lw + bw + 6, y2+8, "Balance at 85:", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(String(lw + bw + 6, y2-4, "620 000 $", fontSize=10, fontName='BodyBold', fillColor=FOREST))

    # Bottom message
    d.add(String(CW/2, 14, "Same portfolio. Same average return. $440,000 difference.", fontSize=9, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    d.add(Rect(lw, 2, 10, 8, fillColor=BRICK, strokeColor=None))
    d.add(String(lw+14, 3, "Negative year", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))
    d.add(Rect(lw+100, 2, 10, 8, fillColor=FOREST_BG, strokeColor=None))
    d.add(String(lw+114, 3, "Positive year", fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

    return d


def make_property_sale_timing():
    """Impact of selling rental property before vs after retirement"""
    d = Drawing(CW, 110)
    lw = 135; bw = CW - lw - 10
    d.add(String(CW/2, 102, "Rental Property Sale — Tax Impact by Timing", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    # Scenario: 200K gain + 80K recapture
    y1 = 68
    d.add(String(0, y1+8, "Sale at age 58", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    d.add(String(0, y1-4, "(pre-retirement)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    items1 = [
        ("CG $100K", 100/280, GOLD),
        ("CCA recap. $80K", 80/280, BRICK),
        ("Tax ~$52K", 52/280, MARINE),
    ]
    x = lw
    for label, frac, col in items1:
        w = frac * bw
        d.add(Rect(x, y1, w, 20, fillColor=col, strokeColor=None))
        if w > 35:
            d.add(String(x+w/2, y1+5, label, fontSize=6.5, fontName='Body', fillColor=white, textAnchor='middle'))
        x += w
    d.add(String(x+6, y1+4, "Rate ~37%", fontSize=8, fontName='BodyBold', fillColor=GOLD))

    y2 = 30
    d.add(String(0, y2+8, "Sale at age 66", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    d.add(String(0, y2-4, "(with OAS + QPP)", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    x = lw
    items2 = [
        ("CG $100K", 100/280, GOLD),
        ("Recap. $80K", 80/280, BRICK),
        ("Tax ~$71K", 71/280, MARINE),
        ("Lost OAS", 20/280, HexColor('#7f1d1d')),
    ]
    for label, frac, col in items2:
        w = frac * bw
        d.add(Rect(x, y2, w, 20, fillColor=col, strokeColor=None))
        if w > 30:
            d.add(String(x+w/2, y2+5, label, fontSize=6.5, fontName='Body', fillColor=white, textAnchor='middle'))
        x += w
    d.add(String(x+6, y2+4, "Rate ~50%", fontSize=8, fontName='BodyBold', fillColor=BRICK))

    d.add(String(CW/2, 6, "Same property, same gain — $19,000 more in tax due to timing", fontSize=8.5, fontName='BodyBold', fillColor=BRICK, textAnchor='middle'))
    return d


def make_smith_manoeuvre_diagram():
    """Smith Manoeuvre flow diagram"""
    d = Drawing(CW, 130)
    d.add(String(CW/2, 122, "Smith Manoeuvre — How It Works", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    bw, bh = 140, 24
    # Box 1: Hypothèque
    x1, y1 = 20, 85
    d.add(Rect(x1, y1, bw, bh, fillColor=BRICK, strokeColor=None, rx=4, ry=4))
    d.add(String(x1+bw/2, y1+7, "Mortgage (non-deductible)", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow down
    d.add(Line(x1+bw/2, y1, x1+bw/2, y1-8, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(String(x1+bw/2+5, y1-6, "repayment", fontSize=6, fontName='Body', fillColor=TEXT_MED))
    # Box 2: HELOC
    y2 = 48
    d.add(Rect(x1, y2, bw, bh, fillColor=GOLD, strokeColor=None, rx=4, ry=4))
    d.add(String(x1+bw/2, y2+7, "HELOC freed up", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow right
    ax = x1+bw+5
    d.add(Line(ax, y2+bh/2, ax+30, y2+bh/2, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(Polygon([ax+30, y2+bh/2+4, ax+30, y2+bh/2-4, ax+36, y2+bh/2], fillColor=GOLD_LIGHT, strokeColor=None))
    d.add(String(ax+15, y2+bh/2+6, "borrow", fontSize=6, fontName='Body', fillColor=TEXT_MED))
    # Box 3: Investissement
    x3 = ax + 40
    d.add(Rect(x3, y2, bw, bh, fillColor=FOREST, strokeColor=None, rx=4, ry=4))
    d.add(String(x3+bw/2, y2+7, "Investment (dividends)", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow down from invest
    y3 = 12
    d.add(Line(x3+bw/2, y2, x3+bw/2, y3+bh, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    # Box 4: Result
    d.add(Rect(x3, y3, bw, bh, fillColor=MARINE, strokeColor=None, rx=4, ry=4))
    d.add(String(x3+bw/2, y3+7, "HELOC interest deductible", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Arrow left from HELOC down
    d.add(Line(x1+bw/2, y2, x1+bw/2, y3+bh, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
    d.add(Rect(x1, y3, bw, bh, fillColor=MARINE_BG, strokeColor=MARINE, strokeWidth=0.5, rx=4, ry=4))
    d.add(String(x1+bw/2, y3+7, "Mortgage → $0 over time", fontSize=7.5, fontName='BodyBold', fillColor=MARINE, textAnchor='middle'))

    return d


def make_salary_vs_dividend_chart():
    """Salary vs dividend effective combined rate comparison"""
    d = Drawing(CW, 100)
    lw = 135; bw = CW - lw - 10
    d.add(String(CW/2, 92, "Salary vs Dividend — Combined Effective Rate (corporate + personal)", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    max_rate = 55
    items = [
        ("Salary $80K", [("Corp. 0%", 0, SAND), ("Pers. 32%", 32, MARINE)], 32),
        ("Eligible div. $80K", [("Corp. 12.2%", 12.2, GOLD), ("Pers. 24%", 24, MARINE)], 36.2),
        ("Ordinary div. $80K", [("Corp. 12.2%", 12.2, GOLD), ("Pers. 28%", 28, MARINE)], 40.2),
        ("Elig. div. $80K + OAS", [("Corp. 12.2%", 12.2, GOLD), ("Pers. 24%", 24, MARINE), ("OAS", 8, BRICK)], 44.2),
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
        [Paragraph('Phase', hs), Paragraph('Age', hs), Paragraph('Action', hs), Paragraph('Rationale', hs)],
        [Paragraph('Pre-retirement', cs), Paragraph('55-60', cb), Paragraph('NR + RRSP meltdown', cb), Paragraph('Fill bracket 1 before CPP', cs)],
        [Paragraph('Transition', cs), Paragraph('60-65', cb), Paragraph('CPP (if deferred) + NR + RRSP', cb), Paragraph('Tax arbitrage pre-OAS', cs)],
        [Paragraph('Cruising', cs), Paragraph('65-72', cb), Paragraph('OAS + CPP + residual RRSP', cb), Paragraph('Protect OAS threshold', cs)],
        [Paragraph('Mandatory RRIF', cs), Paragraph('72+', cb), Paragraph('RRIF (min. withdrawals) + TFSA', cb), Paragraph('TFSA = last resort', cs)],
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
        [Paragraph('', hs), Paragraph('Age 60', hs), Paragraph('Age 65', hs), Paragraph('Age 70', hs)],
        [Paragraph('<b>Adjustment</b>', cs), Paragraph('-36 %', cb), Paragraph('Baseline', cb), Paragraph('+42 %', cb)],
        [Paragraph('<b>Maximum pension</b>', cs), Paragraph('$965/mo', cb), Paragraph('$1,508/mo', cb), Paragraph('$2,141/mo', cb)],
        [Paragraph('<b>Break-even vs 65</b>', cs), Paragraph('—', cb), Paragraph('—', cb), Paragraph('~Age 82', cb)],
        [Paragraph('<b>Advantage if longevity</b>', cs), Paragraph('Death < 74', cb), Paragraph('Balanced', cb), Paragraph('Death > 82', cb)],
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
    canvas.drawRightString(W-MR, MB-22, f"Optimize Your Retirement — p.\u2009{doc.page}")
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
    canvas.drawString(ML+10, H-120, "Optimize")
    canvas.drawString(ML+10, H-153, "Your Retirement")
    canvas.setFont('Body', 10.5); canvas.setFillColor(HexColor('#a0b0cc'))
    canvas.drawString(ML+10, H-183, "Withdrawal, taxation, and optimization")
    canvas.setFont('Body', 9.5); canvas.setFillColor(HexColor('#8899bb'))
    canvas.drawString(ML+10, H-198, "For established portfolios")
    # Gold separator
    canvas.setFillColor(GOLD); canvas.rect(0, H-273, W, 3, fill=1, stroke=0)
    # Description
    canvas.setFont('DisplayItalic', 12.5); canvas.setFillColor(MARINE)
    canvas.drawString(ML+10, H-316, "Taxation. Withdrawal. Fees.")
    canvas.drawString(ML+10, H-334, "The levers that change everything.")
    canvas.setFont('Body', 9.5); canvas.setFillColor(TEXT_MED)
    y = H - 376
    for line in [
        "This guide is for households that have built",
        "significant wealth (RRSP, TFSA, rental properties",
        "or an incorporated business). It turns your",
        "knowledge into concrete decisions.",
    ]:
        canvas.drawString(ML+10, y, line); y -= 15
    # Highlights
    y -= 18
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(0.5)
    canvas.line(ML+10, y, ML+150, y); y -= 16
    highlights = [
        ("201", "Withdrawal  •  Taxation  •  Fees  •  Pensions"),
        ("201", "Income Splitting  •  OAS Protection  •  Risks"),
        ("301", "RRSP Meltdown  •  Guardrails  •  Business"),
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
    canvas.drawString(ML+10, 72, "Included with your BuildFi Intermediate Report")
    canvas.setFont('Body', 7.5)
    canvas.drawString(ML+10, 58, "Up-to-date figures — 2026 Tax Year  •  Adapted for Quebec and Canada")
    canvas.setFillColor(GOLD); canvas.rect(0, 0, W, 4, fill=1, stroke=0)
    canvas.restoreState()


# ═══ BUILD DOCUMENT ═══

def build():
    path = "/home/claude/guide-201-optimize-your-retirement.pdf"
    doc = BaseDocTemplate(path, pagesize=letter,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title="BuildFi — Optimize Your Retirement (201 + Bonus 301)",
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
    story.append(Paragraph("In this guide", S['ch_title']))
    story.append(GoldRule(70, 1.5))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        '<font name="BodyBold" size="10" color="#b8860b">PART 201 — Intermediate Strategies</font>', S['toc_item']))
    story.append(Spacer(1, 4))
    for num, title, sub in [
        ("1","When and how to withdraw","The order that minimizes your tax"),
        ("2","Taxation in retirement","Brackets, credits, and traps"),
        ("3","Protecting your OAS","The clawback and how to avoid it"),
        ("4","Choosing your QPP/CPP age","60, 65 or 70 — the full analysis"),
        ("5","Income splitting","Split to save"),
        ("6","Management fees","The invisible cost eating your wealth"),
        ("7","The risks nobody mentions","Longevity, inflation, sequence"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#b8860b" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">— {sub}</font>', S['toc_item']))

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        '<font name="BodyBold" size="10" color="#5b21b6">BONUS 301 — Advanced Strategies</font>', S['toc_item']))
    story.append(Spacer(1, 4))
    for num, title, sub in [
        ("8","The RRSP meltdown in detail","Strategic drawdown before age 72"),
        ("9","Guardrails — spend without falling","Adjusting withdrawals to the market"),
        ("10","Real estate in your retirement plan","CCA, Smith Manoeuvre, and sale timing"),
        ("11","The incorporated business and retirement","CCPC, extraction, and optimization"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#5b21b6" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">— {sub}</font>', S['toc_item']))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8' color='#888888'>"
        "This guide is provided for informational and educational purposes only. It does not constitute personalized financial, "
        "tax, legal, or investment advice. The strategies and examples presented are general in nature "
        "and results vary depending on personal circumstances, province, and portfolio composition. "
        "Consult a certified financial planner (CFP) or tax specialist before making any decision."
        "</font>", S['body']))
    story.append(Spacer(1, 8))
    story.append(InfoBox('didyouknow', 'PREREQUISITE', [
        'This guide assumes you are familiar with RRSPs, TFSAs, OAS, and CPP/QPP. '
        'If these terms are new to you, start with <font name="BodyBold">Guide 101 — Your Financial Basics</font>.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Where to start?", S['h2']))
    story.append(Paragraph(
        "You don\u2019t need to read this guide from A to Z. Start with the section "
        "that matches your situation:", S['body']))
    story.append(Spacer(1, 4))

    nav_hs = ParagraphStyle('NavH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    nav_s = ParagraphStyle('NavS', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11)
    nav_b = ParagraphStyle('NavB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11)

    nav_data = [
        [Paragraph('Your situation', nav_hs), Paragraph('Start with', nav_hs), Paragraph('Then explore', nav_hs)],
        [Paragraph('I\'m retiring soon', nav_s), Paragraph('Ch. 1 — Withdrawal', nav_b), Paragraph('Ch. 4 (CPP) → Ch. 3 (OAS)', nav_s)],
        [Paragraph('I have a large RRSP (500K+)', nav_s), Paragraph('Ch. 8 — RRSP Meltdown', nav_b), Paragraph('Ch. 3 (OAS) → Ch. 2 (Taxation)', nav_s)],
        [Paragraph('We are a couple', nav_s), Paragraph('Ch. 5 — Income Splitting', nav_b), Paragraph('Ch. 1 (Order) → Ch. 4 (CPP)', nav_s)],
        [Paragraph('I\'m paying too much in fees', nav_s), Paragraph('Ch. 6 — Management Fees', nav_b), Paragraph('Ch. 7 (Risks)', nav_s)],
        [Paragraph('I own rental properties', nav_s), Paragraph('Ch. 10 — Real Estate', nav_b), Paragraph('Ch. 3 (OAS) → Ch. 2 (Taxation)', nav_s)],
        [Paragraph('I have an incorporated business', nav_s), Paragraph('Ch. 11 — Business', nav_b), Paragraph('Ch. 8 (Meltdown) → Ch. 9 (Guardrails)', nav_s)],
        [Paragraph('I want to understand it all', nav_s), Paragraph('Ch. 1 — page 1', nav_b), Paragraph('Read in order!', nav_s)],
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
        "Each chapter is self-contained. Cross-references between chapters guide you when topics complement each other."
        "</font>", S['body']))

    # ════════════════════════════════════════
    #  PARTIE 201 — STRATÉGIES INTERMÉDIAIRES
    # ════════════════════════════════════════

    # ═══ CH 1 — DÉCAISSEMENT ═══
    story.append(Spacer(1, 22))
    story.append(KeepTogether([
        ChapterHeader("1", "When and how to withdraw", "The order that minimizes your lifetime tax"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "Accumulating savings is one thing. Withdrawing them intelligently is another. "
            "The order in which you withdraw from your accounts can easily represent "
            "<font name='BodyBold'>$50,000 to $150,000 less in tax</font> over 25 years of retirement. "
            "It\u2019s probably the most important financial decision \u2014 and the least discussed.", S['body_intro']),
    ]))

    story.append(PullQuote("Retirement isn\u2019t a balance. It\u2019s the strategic management of an income stream over 30 years."))
    story.append(Spacer(1, 4))

    story.append(Paragraph("The fundamental principle", S['h2']))
    story.append(Paragraph(
        "Each account has different tax treatment on withdrawal. The RRSP is 100% taxable. "
        "The TFSA is tax-free. The non-registered account (NR) is partially taxable "
        "(capital gains at 50%, dividends with credit). The goal: withdraw from each account "
        "when the tax rate is as low as possible.", S['body']))

    story.append(make_withdrawal_order())
    story.append(Paragraph(
        "<font name='Body' size='7' color='#888888'>* Estimate based on typical profiles. "
        "Actual results vary by province, marginal rate, account size, and marital status.</font>",
        ParagraphStyle('fn', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, spaceBefore=2, spaceAfter=4)))
    story.append(Spacer(1, 6))

    story.append(Paragraph("The four phases of withdrawal", S['h2']))
    story.append(make_decumulation_table())
    story.append(Spacer(1, 8))

    story.append(InfoBox('dollars', 'IN DOLLARS \u2014 The impact of the right order', [
        'Couple, age 65, RRSP $400,000, TFSA $200,000, NR $100,000. '
        'Conventional withdrawal (RRSP first): estimated total tax over 25 years = <font name="BodyBold">$185,000</font>. '
        'Optimized withdrawal (meltdown + NR first + TFSA preserved): <font name="BodyBold">$112,000</font>. '
        'Difference: <font name="BodyBold">up to $73,000</font> in potential tax savings \u2014 depending on profile, province, and RRSP size.',
    ]))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'Your Intermediate Report automatically simulates the optimal withdrawal order based on your accounts, '
        'your province, and your pension income. The <font name="BodyBold">Withdrawal</font> tab shows the year-by-year plan.',
    ]))

    # ═══ CH 2 — FISCALITÉ ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("2", "Taxation in retirement", "What the government takes back — and how to limit the damage"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "In retirement, your income changes in nature: salary replaced by pensions, RRIF withdrawals, "
        "CPP/QPP and OAS. Each source is taxed differently. Understanding tax brackets "
        "and available credits means understanding why certain decisions are worth thousands of dollars.", S['body_intro']))

    story.append(make_tax_bracket_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Retirement income and its tax treatment", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>RRIF / RRSP</font> \u2014 100% taxable like salary. It\u2019s the most \u201cexpensive\u201d account to withdraw from. "
        "<font name='BodyBold'>QPP / CPP</font> \u2014 100% taxable, but qualifies for the pension income credit ($2,000 at 65+). "
        "<font name='BodyBold'>OAS</font> \u2014 100% taxable, with an effective marginal rate up to 15% higher (clawback). "
        "<font name='BodyBold'>TFSA</font> \u2014 Never taxable. Doesn\u2019t affect OAS, GIS, or any credit. "
        "<font name='BodyBold'>Capital gains (NR)</font> \u2014 Taxable at 50% (inclusion). "
        "<font name='BodyBold'>Canadian dividends</font> \u2014 Taxable with credit. Lower effective rate, but gross-up inflates net income (affects OAS).", S['body']))

    story.append(InfoBox('caution', 'CAUTION \u2014 The dividend gross-up trap', [
        'Canadian dividends are \u201cgrossed up\u201d before being taxed. An eligible dividend of $50,000 '
        'becomes $69,000 in taxable income. Even though the tax credit reduces actual tax, '
        'this grossed-up income can trigger OAS clawback. During withdrawal, this trap is common.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("The pension income credit", S['h2']))
    story.append(Paragraph(
        "Starting at age 65, the first $2,000 of eligible pension income (RRIF, DB pension annuity) "
        "qualifies for a 15% federal credit + a provincial credit. In Quebec, that\u2019s roughly "
        "$300 in savings per person. For a couple, it doubles. "
        "If you don\u2019t have a DB pension, a minimal $2,000 RRIF withdrawal is enough to trigger the credit.", S['body']))

    story.append(Paragraph("The effective marginal rate \u2014 the real bill", S['h2']))
    story.append(Paragraph(
        "The government\u2019s published marginal tax rate doesn\u2019t tell the whole story. "
        "Every additional dollar of income can also reduce your OAS, your GIS, your "
        "GST/HST credit, and your age credit. These clawbacks stack. "
        "The result: an <font name='BodyBold'>effective</font> marginal rate that can exceed 70% "
        "in certain income zones \u2014 well beyond the official rate.", S['body']))

    story.append(make_effective_marginal_chart())
    story.append(Spacer(1, 8))

    story.append(InfoBox('caution', 'CAUTION \u2014 The GIS zone is a tax trap', [
        'A retiree receiving GIS who withdraws $1,000 from their RRIF loses: '
        '~$150 in tax + $500 in GIS clawed back + ~$50 in reduced GST credit = '
        '<font name="BodyBold">$700 in deductions on $1,000</font>. '
        'Effective rate: 70%. That\u2019s why the TFSA is crucial for low-income retirees: '
        'it doesn\u2019t affect any of these calculations.',
    ]))
    story.append(Spacer(1, 6))

    story.append(InfoBox('brief', 'IN BRIEF \u2014 Retirement taxation', [
        '\u2022 RRIF/RRSP = the most heavily taxed account. Withdraw strategically, not by default.',
        '\u2022 TFSA = often the most advantageous account to preserve. Consider withdrawing from it last.',
        '\u2022 Dividends = useful credit, but gross-up can trigger OAS clawback.',
        '\u2022 $2,000 pension credit at 65+ = a tax benefit not to forget.',
        '\u2022 True effective marginal rate (tax + clawbacks) can exceed 70% \u2014 plan accordingly.',
    ]))

    # ═══ CH 3 — PROTÉGER PSV ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("3", "Protecting your OAS", "The clawback — and how to avoid it"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Old Age Security (OAS) is worth $742/month in 2026 for ages 65\u201374 "
        "($817/month for 75+). Over 25 years, that\u2019s more than $220,000. "
        "But if your net income exceeds $95,323, the government claws back 15\u00a2 per dollar above that. "
        "Around $155,000, your OAS drops to zero.", S['body_intro']))

    story.append(make_oas_clawback_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Five strategies to protect your OAS", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>1. RRSP meltdown before 72.</font> Consider gradually withdrawing from your RRSP between 60 and 72 "
        "to avoid forced RRIF withdrawals that inflate your income at 72+. This is often the most advantageous strategy "
        "for large RRSPs (details in chapter 8).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2. Prioritize the TFSA.</font> TFSA withdrawals don\u2019t count in the net income calculation "
        "for OAS. If you have the choice between RRSP and TFSA during accumulation, consider the TFSA "
        "if you expect high income in retirement.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3. Split pension income.</font> If your spouse has lower income, "
        "transfer up to 50% of your eligible pension income to them. Two incomes of $70,000 are better "
        "than one of $140,000 (chapter 5).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>4. Defer OAS to 70.</font> If you have sufficient other income between 65 and 70, "
        "deferring OAS increases the benefit by 36% \u2014 and may allow you to complete the RRSP meltdown "
        "before OAS is added to your taxable income.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>5. Watch dividends.</font> The Canadian dividend gross-up inflates "
        "your net income even though actual tax is reduced by the credit. In the clawback zone, "
        "capital gains (50% inclusion) are often preferable to dividends.", S['body']))

    story.append(InfoBox('dollars', 'IN DOLLARS \u2014 The cost of the clawback', [
        'Net income of $115,000 at age 65. Threshold exceeded: $19,677 \u00d7 15% = '
        '<font name="BodyBold">$2,952/year in lost OAS</font>. '
        'Over 25 years (with indexation): more than <font name="BodyBold">$85,000 in lost benefits</font>. '
        'The real marginal tax in the clawback zone = your provincial/federal rate + 15% = often over 60%.',
    ]))

    # ═══ CH 4 — ÂGE RRQ ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("4", "Choosing your QPP/CPP age", "60, 65, or 70 — a permanent decision"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "The decision of when to start your QPP/CPP is irreversible. "
        "At 60, you receive 36% less than at 65 \u2014 for the rest of your life. "
        "At 70, you receive 42% more. The right answer depends on your health, "
        "your other income sources, and your life expectancy.", S['body_intro']))

    story.append(make_rrq_timing_table())
    story.append(Spacer(1, 10))

    story.append(Paragraph("The break-even — how long to recover?", S['h2']))
    story.append(Paragraph(
        "If you defer from 65 to 70, you forgo 5 years of pension (~$90,000 cumulative at maximum). "
        "In return, each monthly payment is 42% higher. The break-even is around age 82: "
        "if you live beyond that, deferral wins. The life expectancy of a 65-year-old Canadian "
        "is roughly 87 (male) and 89 (female). The probability of exceeding 82 is high.", S['body']))

    story.append(Paragraph("When claiming early makes sense", S['h2']))
    story.append(Paragraph(
        "Health issues reducing life expectancy. Immediate need for cash and no "
        "other income sources. Surviving spouse with low income \u2014 the survivor\u2019s pension "
        "is based on your pension, not the maximum. In these cases, receiving less but longer "
        "has less value than immediate income.", S['body']))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'The <font name="BodyBold">Optimizer</font> tab automatically tests all 11 QPP and OAS age combinations (60 to 70) '
        'and displays the one that maximizes your Monte Carlo success rate. The result isn\u2019t an average \u2014 '
        'it\u2019s the optimal choice <font name="BodyBold">for your specific situation</font>.',
    ]))

    # ═══ CH 5 — FRACTIONNEMENT ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("5", "Income splitting", "Split to save — for couples"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Starting at age 65, you can transfer up to 50% of your eligible pension income "
        "to your spouse on your tax returns. Eligible pension income includes: "
        "RRIF withdrawals, DB pension annuities, and certain life annuities. "
        "QPP/CPP, OAS, and RRSP withdrawals (before RRIF conversion) are not eligible.", S['body_intro']))

    story.append(make_splitting_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph("Why this is so powerful", S['h2']))
    story.append(Paragraph(
        "Canada\u2019s tax system is progressive: the more you earn, the higher the marginal rate. "
        "If one spouse is at 45% and the other at 27%, split 50% of the first spouse\u2019s pension to the second. "
        "Every dollar transferred moves from a 45% bracket to a 27% bracket \u2014 that\u2019s 18\u00a2 saved per dollar. "
        "On a $60,000 pension income, splitting $30,000 can save "
        "between $3,000 and $5,000 in tax per year.", S['body']))

    story.append(InfoBox('quebec', 'QUEBEC \u2014 Splitting works provincially too', [
        'Revenu Qu\u00e9bec accepts pension income splitting under the same conditions as federal. '
        'Federal form T1032 and provincial form TP-1012.A apply simultaneously. '
        'The savings are therefore double: federal and provincial.',
    ]))

    story.append(Spacer(1, 6))
    story.append(InfoBox('caution', 'CAUTION \u2014 What you cannot split', [
        'QPP/CPP is <font name="BodyBold">not</font> eligible for pension splitting (a separate QPP sharing exists, '
        'but it\u2019s a different and permanent mechanism). RRSP withdrawals before 65 are not eligible either. '
        'And the TFSA doesn\u2019t need to be split \u2014 it\u2019s already tax-free.',
    ]))

    # ═══ CH 6 — FRAIS ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("6", "Management fees", "The invisible cost eating your wealth"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Management fees (MER \u2014 Management Expense Ratio) are the silent predator of your retirement. "
        "The average Canadian mutual fund charges about 2.2% per year. Seems small. "
        "Over 30 years, it\u2019s the difference between retiring at 60 or at 67.", S['body_intro']))

    story.append(make_fee_impact_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("Why 2% destroys your wealth", S['h2']))
    story.append(Paragraph(
        "Fees are deducted from the total balance, every year, regardless of performance. "
        "If the market returns 7% and your fees are 2.2%, your net return is 4.8%. "
        "But the impact isn\u2019t 2% \u2014 it\u2019s compounded. "
        "On $200,000 invested for 30 years at 6% gross: an ETF at 0.20% produces $578,000, "
        "a fund at 2.20% produces $349,000. The $229,000 difference represents the cumulative cost of management fees.", S['body']))

    story.append(Paragraph("Low-fee options in Canada", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Index ETFs</font> \u2014 Offered by multiple providers (Vanguard, iShares, BMO, etc.). MER of 0.05% to 0.25%. "
        "Requires a brokerage account (e.g. Questrade, Wealthsimple Trade, Disnat, etc.). "
        "<font name='BodyBold'>All-in-one portfolios</font> \u2014 E.g. VBAL, XBAL, VGRO (MER ~0.24%). A single ETF, "
        "automatic rebalancing. May be suitable if you don\u2019t want to manage your allocation. "
        "<font name='BodyBold'>Robo-advisors</font> \u2014 E.g. Wealthsimple Invest, Questwealth (~0.5% all-in). "
        "Automated management, automatic contributions.", S['body']))

    story.append(InfoBox('brief', 'IN BRIEF \u2014 Management fees', [
        '\u2022 MER of 2% vs 0.2% = <font name="BodyBold">$229,000 difference</font> over 30 years ($200K invested).',
        '\u2022 As an example, all-in-one ETFs (like VBAL, VGRO, or XGRO) offer a simple low-fee solution.',
        '\u2022 Fees are built into the products \u2014 not billed separately. This can create an implicit conflict of interest between your financial institution and you.',
    ]))

    # ═══ CH 7 — RISQUES ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("7", "The risks nobody mentions", "Longevity, inflation, sequence \u2014 the three invisible enemies"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Financial plans rarely fail because of a single market crash. "
        "They fail because of slow, cumulative, and often ignored risks. "
        "Three of them deserve your immediate attention.", S['body_intro']))

    story.append(Paragraph("1. Longevity risk", S['h2']))
    story.append(Paragraph(
        "You plan for age 85, but you live to 97. That\u2019s 12 years of unplanned expenses. "
        "A 65-year-old Canadian has about a 30% chance of living to 90 and a 10% chance "
        "of exceeding 95. For a couple, the probability that at least one lives past 90 exceeds 50%. "
        "Deferring QPP/CPP to 70 is a form of longevity insurance: the pension, indexed to inflation, "
        "increases with each year of deferral and lasts your entire life.", S['body']))

    story.append(Paragraph("2. Inflation risk", S['h2']))
    story.append(Paragraph(
        "3% annual inflation cuts your purchasing power in half in 24 years. "
        "Healthcare costs typically rise faster than general inflation. "
        "OAS is indexed (protected). QPP/CPP is indexed. But your RRSP, TFSA, and NR withdrawals are not \u2014 "
        "it\u2019s up to you to plan for withdrawals that must increase over time.", S['body']))

    story.append(Paragraph("3. Sequence of returns risk", S['h2']))
    story.append(Paragraph(
        "A 30% crash the year you retire is catastrophic. The same crash 10 years later, "
        "much less so. Why? Because early in retirement, you\u2019re withdrawing from a falling portfolio \u2014 "
        "every withdrawal amplifies the loss. This is <font name='BodyBold'>sequence risk</font>.", S['body']))

    story.append(make_sequence_risk_chart())
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "Protection: keep 2 to 3 years of expenses in cash or short-term bonds "
        "so you never have to sell stocks during a downturn. This is your \u201cwithdrawal cushion\u201d \u2014 "
        "the retirement equivalent of the emergency fund.", S['body']))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'Your Report automatically tests <font name="BodyBold">6 stress scenarios</font>: '
        'immediate crash (-40%), high inflation (5%), stagflation, lost decade, '
        'and extreme longevity (age 100). The <font name="BodyBold">Stress Tests</font> tab shows whether your plan survives the worst historical scenarios.',
    ]))

    # ════════════════════════════════════════
    #  PARTIE 301 — BONUS AVANCÉ
    # ════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionDivider("BONUS 301 — Advanced Strategies", "For those who want every dollar of optimization", PURPLE))
    story.append(Spacer(1, 10))

    story.append(InfoBox('expert', 'WHO IS THE 301 FOR?', [
        'Chapters 8 to 11 are for complex wealth situations: '
        'RRSP over $500,000, incorporated business (CCPC), rental properties, or Smith Manoeuvre. '
        'If that\u2019s not your case, chapters 1 to 7 cover the essentials of your optimization.',
    ]))
    story.append(Spacer(1, 8))

    story.append(InfoBox('didyouknow', 'A NOTE ON DEPTH', [
        'Each topic covered in this section \u2014 real estate taxation, '
        'corporate planning, the RRSP meltdown, dynamic withdrawal strategies \u2014 '
        'could fill an entire book. This also applies to several chapters '
        'in Part 201 as well: income splitting, OAS protection, and management fees '
        'are rich and nuanced topics.',
        'Our goal here is not to replace a tax specialist or financial planner. '
        'It\u2019s to give you the decision-making framework \u2014 the right questions, the right reflexes, '
        'the traps to know \u2014 so that your conversations with your professionals are '
        'more productive and your BuildFi Report makes full sense.',
    ]))
    story.append(Spacer(1, 14))

    # ═══ CH 8 — MELTDOWN ═══
    story.append(ChapterHeader("8", "The RRSP meltdown in detail", "Strategic drawdown — the most powerful lever"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Le «\u00a0meltdown\u00a0» REER consiste à retirer volontairement de votre REER avant l'âge de 72 ans "
        "to stay in a low tax bracket and avoid forced RRIF withdrawals that could "
        "trigger OAS clawback. It’s counterintuitive — you’ve been told your whole life not to "
        "touch your RRSP. But in withdrawal, the rules change.", S['body_intro']))

    story.append(make_meltdown_chart())
    story.append(Spacer(1, 10))

    story.append(Paragraph("How it works — step by step", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 1\u00a0:</font> Identify your target tax bracket. In Quebec in 2026, "
        "the first federal bracket ends at $57\u202f375\u00a0$. En combinant fédéral et provincial, "
        "the marginal rate stays around 27–32\u00a0% sous ce seuil.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 2\u00a0:</font> Calculate your fixed income (QPP/CPP, DB pension, part-time work). "
        "L'espace résiduel dans le palier cible est votre «\u00a0budget de meltdown\u00a0» annuel.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 3\u00a0:</font> Withdraw that amount from your RRSP each year. Deposit the net into your TFSA "
        "(if you have room) or into an NR account.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Étape 4\u00a0:</font> À 72, your RRSP converted to a RRIF will be much smaller — "
        "mandatory withdrawals will no longer inflate your income beyond the OAS threshold.", S['body']))

    story.append(InfoBox('expert', 'ADVANCED STRATEGY — Aggressive pre-CPP meltdown', [
        'If you retire before 60 and your income is very low, you can fill '
        'the lowest tax brackets with massive RRSP withdrawals at a 15\u201320% tax rate.\u00a0%. '
        'C\'est le moment idéal\u00a0: aucun RRQ, aucune PSV ne s\'ajoute à votre revenu. '
        'BuildFi calls this window the <font name="BodyBold">«\u00a0golden meltdown zone\u00a0»</font> — between retirement and age 65.',
    ]))

    story.append(InfoBox('caution', 'ATTENTION — Quand le meltdown n\'est pas optimal', [
        'If your RRSP is modest (under $200,000\u202f000\u00a0$), les retraits FERR obligatoires à 72+ ne dépasseront '
        'the OAS threshold. The meltdown then isn’t worth the complexity. '
        'BuildFi automatically calculates whether the meltdown improves your outcome \u2014 check the Optimizer tab.',
    ]))

    # ═══ CH 9 — GUARDRAILS ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("9", "Guardrails — spend without falling", "Adjusting your withdrawals to the market"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "The 4% rule\u00a0% is well known\u00a0: withdraw 4%\u00a0% de votre portefeuille la première année, "
        "then adjust for inflation. Simple, but rigid. "
        "It’s based on historical U.S. data (1926–1995) — "
        "decades when bond yields were higher and stock valuations lower than today. "
        "Several researchers estimate a safe current rate is closer to 3.3%\u00a0% et 3,8\u00a0%. "
        "Si le marché chute de 40\u00a0% et que "
        "you withdraw the same amount, you deplete your portfolio faster. "
        "Les <font name='BodyBold'>guardrails</font> are a dynamic approach:\u00a0: "
        "your withdrawals adapt to market performance.", S['body_intro']))

    story.append(Paragraph("The guardrails principle", S['h2']))
    story.append(Paragraph(
        "Set a band around your target withdrawal rate. Par exemple, cible de 4,5\u00a0%, "
        "floor at 3.5%\u00a0%, ceiling at 5.5%\u00a0%. "
        "Si votre portefeuille performe bien et que votre taux effectif tombe sous 3,5\u00a0%, "
        "you increase your withdrawals (you can spend more). "
        "Si le marché chute et que votre taux dépasse 5,5\u00a0%, you temporarily reduce "
        "(you cut discretionary spending). This simple mechanism protects your capital "
        "while letting you enjoy the good years.", S['body']))

    story.append(InfoBox('dollars', 'EN DOLLARS — Guardrails en action', [
        'Portefeuille de 800\u202f000\u00a0$. Retrait initial de 36\u202f000\u00a0$/an (4,5\u00a0%). '
        'Après un krach de 25\u00a0%, portefeuille à 600\u202f000\u00a0$. Taux effectif\u00a0: 6,0\u00a0% (au-dessus du plafond de 5,5\u00a0%). '
        'Action\u00a0: réduire le retrait à 33\u202f000\u00a0$/an (5,5\u00a0% × 600K). '
        'When the portfolio recovers to $800K+, withdrawal returns to normal.',
    ]))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'L\'onglet <font name="BodyBold">Guardrails</font> dans votre Bilan Expert calcule automatiquement '
        'the optimal high and low thresholds based on your Monte Carlo success rate. '
        'C\'est un système de «\u00a0pilote automatique\u00a0» pour vos retraits.',
    ]))

    # ═══ CH 10 — IMMOBILIER ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("10", "Real estate in your retirement plan", "CCA, Smith Manoeuvre, and sale timing"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "A rental property is a powerful retirement asset — passive income, appreciation, tax advantages. "
        "But it’s also a complex asset at withdrawal time. The Capital Cost Allowance (CCA) "
        "que vous avez réclamée pendant des années devra être «\u00a0remboursée\u00a0» au fisc lors de la vente. "
        "The timing of your sale can easily represent a difference of "
        "<font name='BodyBold'>15\u202f000 à 40\u202f000\u00a0$</font> in tax — for the same property.", S['body_intro']))

    story.append(Paragraph("CCA — a double-edged tax advantage", S['h2']))
    story.append(Paragraph(
        "The Capital Cost Allowance (CCA) reduces your taxable income each year, typically at a rate "
        "de 4\u00a0% declining balance (Class 1). On a $500,000 building\u202f000\u00a0$ (bâtiment seulement, "
        "excluding land), that’s about $20,000\u202f000\u00a0$ in deductions in the first year. "
        "Mais à la vente, toute la DPA accumulée est «\u00a0récupérée\u00a0» et imposée comme revenu ordinaire — "
        "not as capital gains. That means 100%\u00a0% inclusion, at the full marginal rate.", S['body']))

    story.append(InfoBox('dollars', 'IN DOLLARS \u2014 The impact of CCA recapture', [
        'Building purchased for $400,000\u202f000\u00a0$ (bâtiment). CCA claimed over 15 years\u00a0: ~120\u202f000\u00a0$. '
        'Vendu 550\u202f000\u00a0$. Gain en capital\u00a0: 150\u202f000\u00a0$ (inclusion 50\u00a0% = 75\u202f000\u00a0$ imposable). '
        'CCA recapture\u00a0: 120\u202f000\u00a0$ imposable à 100\u00a0%. '
        '<font name="BodyBold">Total imposable l\'année de la vente\u00a0: 195\u202f000\u00a0$</font> — '
        'enough to lose your entire OAS and hit the 50%+ bracket.\u00a0%+.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("When to sell — timing changes everything", S['h2']))
    story.append(make_property_sale_timing())
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Selling before retirement (when your only income is salary) keeps the capital gain in "
        "a predictable bracket. Selling after, when CPP + OAS + RRIF stack up, pushes your income "
        "into higher brackets and triggers OAS clawback. The optimal strategy:\u00a0: "
        "planifiez la vente dans une année de «\u00a0creux fiscal\u00a0» — entre la fin de l'emploi et le début "
        "of CPP, or during the RRSP meltdown window.", S['body']))

    story.append(InfoBox('goodtoknow', 'GOOD TO KNOW — The capital gains inclusion rate', [
        'Depuis juin 2024, le taux d\'inclusion des gains en capital passe de 50\u00a0% à 66,67\u00a0% '
        'above $250,000\u202f000\u00a0$ in annual gains for individuals. For corporations, '
        'the rate is 66.67%\u00a0% dès le premier dollar. Planifiez les ventes d\'immeubles '
        'accordingly — spreading dispositions over multiple years may be advantageous.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("The Smith Manoeuvre — converting your mortgage into a deduction", S['h2']))
    story.append(Paragraph(
        "The Smith Manoeuvre is a strategy that turns your non-deductible mortgage debt "
        "into deductible debt. The mechanism is simple in theory, but requires discipline.", S['body']))

    story.append(make_smith_manoeuvre_diagram())
    story.append(Spacer(1, 8))

    story.append(Paragraph("The mechanism in 4 steps", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>1.</font> You repay your mortgage normally. Each payment frees up "
        "room on your home equity line of credit (HELOC) attached to the property.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2.</font> You immediately re-borrow on the HELOC the same amount as the principal "
        "repaid.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3.</font> You invest that money in eligible investments that produce "
        "taxable income (Canadian dividend stocks, dividend ETFs).", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>4.</font> The HELOC interest becomes tax-deductible (the loan is used to "
        "earn income). Over time, your non-deductible mortgage decreases and your deductible debt increases.", S['body']))

    story.append(InfoBox('caution', 'CAUTION — Smith Manoeuvre risks', [
        'You increase your market exposure with leverage. If markets drop 30%,\u00a0%, '
        'you still owe interest on your HELOC. '
        'Deductibility requires that investments target income — not just capital gains. '
        'The CRA may challenge the deduction if the link between the loan and income is not clear. '
        'This strategy suits investors with a long horizon (10+ years) and high risk tolerance.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("HELOC as a last-resort reserve", S['h2']))
    story.append(Paragraph(
        "En période de décaissement, la HELOC peut servir de «\u00a0tampon\u00a0» pour éviter de vendre "
        "investments at a loss. If the market drops and you need cash, "
        "temporarily borrowing on your HELOC (at 7–8%)\u00a0%) may be preferable to crystallizing "
        "a 30% loss\u00a0% on your investments. BuildFi models this option "
        "as a last resort in the withdrawal sequence.", S['body']))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'Each property is modeled individually\u00a0: mortgage, HELOC, CCA, Smith Manoeuvre, '
        'net rental income, and sale simulation. L\'onglet <font name="BodyBold">Immobilier</font> '
        'shows the tax impact of each disposition scenario \u2014 and the best time to sell.',
    ]))

    # ═══ CH 11 — ENTREPRENEUR ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("11", "The incorporated business and retirement", "CCPC, extraction, and optimization"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Your Canadian-controlled private corporation (CCPC) is a tax deferral vehicle "
        "during your working years. But in retirement, every dollar must come out — "
        "and how you extract it determines how much the government keeps. "
        "It’s a chess game between the corporate rate, personal rate, CPP/QPP, OAS, "
        "and tax integration.", S['body_intro']))

    story.append(Paragraph("Tax deferral — why it changes the math", S['h2']))
    story.append(Paragraph(
        "Active income from a CCPC eligible for the SBD is taxed at about 12.2%\u00a0% au Québec "
        "(combined federal/provincial) on the first $500,000\u202f000\u00a0$ of active income. "
        "Compared to the personal rate that can reach 53%,\u00a0%, that’s a massive deferral. "
        "The money stays in the corporation and can be invested. But beware:\u00a0: "
        "it’s only a <font name='BodyBold'>report</font>, not a permanent saving. "
        "At the time of extraction (salary or dividend), personal tax applies.", S['body']))

    story.append(Paragraph("The SBD grind — the $50,000 trap\u202f000\u00a0$", S['h2']))
    story.append(Paragraph(
        "If your corporation generates more than $50,000\u202f000\u00a0$ in passive investment income per year "
        "(interest, dividends, capital gains), the SBD limit is gradually reduced. "
        "À 150\u202f000\u00a0$ in passive income, the SBD drops to zero — your corporate rate goes "
        "from about 12%\u00a0% to about 26%\u00a0% on active income. "
        "C'est le «\u00a0grind\u00a0». Concretely, every dollar of passive income above $50,000\u202f000\u00a0$ "
        "costs you $5\u00a0$ in lost SBD. The impact can exceed the investment’s return.", S['body']))

    story.append(InfoBox('caution', 'CAUTION — The grind in dollars', [
        'Corporation with $600,000\u202f000\u00a0$ in investments generating 5%\u00a0% = 30\u202f000\u00a0$ passive income. No problem. '
        'Mais à 1,2\u00a0M$ en placements → 60\u202f000\u00a0$ passive → loss of $50,000 SBD\u202f000\u00a0$ de DPE → '
        '<font name="BodyBold">~7\u202f000\u00a0$ d\'in additional corporate tax per year</font> on active income. '
        'Plan extractions to keep passive income below the threshold.',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Salary vs dividend in retirement", S['h2']))
    story.append(Paragraph(
        "The classic question takes on a different dimension in retirement. The choice is no longer "
        "just about taxes — it also affects CPP/QPP, OAS, and GIS.", S['body']))

    story.append(make_salary_vs_dividend_chart())
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<font name='BodyBold'>Salaire</font> — Deductible for the corporation. Contributes to QPP/CPP (increases your future pension). "
        "Creates RRSP room. Taxed at personal marginal rate. No gross-up — doesn’t affect "
        "OAS beyond the actual amount.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Eligible dividend</font> — Paid from income taxed at the general corporate rate. "
        "Grossed up by 38%\u00a0% for taxable income calculation. 15.02%\u00a0% fédéral. "
        "Personal effective rate often lower than salary — but the gross-up inflates net income "
        "and can trigger OAS clawback.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>Ordinary dividend</font> — Paid from income taxed at the SBD rate. "
        "Grossed up by 15%.\u00a0%. Lower credit. Effective rate generally higher than eligible. "
        "Less risky for OAS thanks to the lower gross-up.", S['body']))

    story.append(InfoBox('expert', 'STRATÉGIE AVANCÉE — L\'extraction en 3 couches', [
        '<font name="BodyBold">Couche 1\u00a0:</font> Minimal salary (~$15,000)\u202f000\u00a0$) to contribute to QPP/CPP and protect your entitlements. '
        'Generates ~$2,700\u202f700\u00a0$ d\'espace REER.',
        '<font name="BodyBold">Couche 2\u00a0:</font> Dividendes en capital (CDC) — entièrement libres d\'impôt. '
        'Your CDA fills up with each realized capital gain in the corporation (50%\u00a0% non-taxable).',
        '<font name="BodyBold">Couche 3\u00a0:</font> Taxable dividends to fill the rest, targeting '
        'the OAS threshold of $95,323\u202f323\u00a0$ (net income including gross-up).',
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("The RDTOH account — the hidden refundable tax", S['h2']))
    story.append(Paragraph(
        "When your corporation earns investment income, it pays higher tax (~50%)\u00a0%) "
        "dont une partie est «\u00a0remboursable\u00a0» au moment de verser des dividendes. C'mechanism. "
        "RDTOH (refundable dividend tax on hand) mechanism. Concretely:\u00a0: "
        "for every $2.61\u00a0$ of eligible dividend paid, the corporation recovers $1\u00a0$ of RDTOH. "
        "It’s an incentive to extract money — and a key element of extraction planning.", S['body']))

    story.append(Paragraph("Liquidation — when to wind down the corporation", S['h2']))
    story.append(Paragraph(
        "Eventually, your corporation’s balance must be extracted. The options:\u00a0: gradual dividends (planned), "
        "pipeline (transfer to a holding company), or formal liquidation. "
        "The pipeline is an advanced strategy that converts a deemed dividend into a capital gain — "
        "but the CRA has it in its sights. Consult a tax specialist before any pipeline planning.", S['body']))

    story.append(InfoBox('goodtoknow', 'WHAT BUILDFI DOES', [
        'L\'onglet <font name="BodyBold">Entreprise</font> projects your corporate balance year by year\u00a0: '
        'active income, passive investments, dividends paid, SBD grind alert. '
        'The <font name="BodyBold">Compensation Optimizer</font> tests salary/dividend combinations '
        'to find the extraction that maximizes your net income after personal and corporate tax \u2014 '
        'en tenant compte du RRQ, de la PSV et de l\'espace REER.',
    ]))

    # ═══ ERREURS FRÉQUENTES 201 ═══
    story.append(Spacer(1, 22))
    story.append(Paragraph(
        '<font name="DisplayBold" size="18" color="#b91c1c">The 5 most costly withdrawal mistakes</font>', S['ch_title']))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "These mistakes are measured in tens of thousands of dollars. They’re common — "
        "and avoidable with minimal planning.", S['body_intro']))

    erreurs_201 = [
        ("1. Taking QPP/CPP at 60 without analysis",
         "The 36% reduction is permanent.\u00a0% If you live to 85, deferring to 65 or 70 "
         "can represent over $100,000\u202f000\u00a0$ in additional lifetime income. "
         "The decision depends on your life expectancy, your other income, and your liquidity needs — "
         "pas d'un «\u00a0j'en ai besoin maintenant\u00a0»."),
        ("2. Ignoring OAS clawback",
         "Every dollar of income above $95,323\u202f323\u00a0$ costs you 15¢ in clawed-back OAS — on top of\u00a0¢  "
         "normal tax. Over 20 years, the loss can exceed $85,000.\u202f000\u00a0$. Forced RRIF withdrawals at 72+ "
         "are the most common cause."),
        ("3. Withdrawing from the TFSA first",
         "The TFSA is your most valuable retirement account — withdrawals don’t affect your tax, "
         "your OAS, or your GIS. Touching it first is almost always suboptimal. "
         "Withdraw from non-registered and RRSP first."),
        ("4. Keeping a portfolio at 2% fees\u00a0% for 30 years of retirement",
         "On a $500,000 portfolio\u202f000\u00a0$, the difference between 0.25% and 2.20%\u00a0% et 2,20\u00a0% de frais "
         "represents over $350,000\u202f000\u00a0$ sur 30 ans. That’s the equivalent of 5 full years of expenses "
         "lost to invisible fees."),
        ("5. Not splitting pension income",
         "A couple where only one spouse has a pension can save $3,000 to $5,000\u202f000 à 5\u202f000\u00a0$ in tax per year "
         "by transferring up to 50%\u00a0% of eligible income. Form T1032 (federal) + TP-1012.A (Quebec). "
         "No cost. No risk. Just a form to fill out."),
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
    story.append(PullQuote("Optimization isn’t speculation. It’s paying the right amount of tax — not a dollar more."))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Your BuildFi Report applies these strategies", S['h2']))
    story.append(Paragraph(
        "This guide gave you the conceptual framework. Your Report turns it into a concrete plan, "
        "adapted to your province, your accounts, your couple, and your properties.", S['body']))

    story.append(InfoBox('dollars', 'WHAT YOUR INTERMEDIATE REPORT GIVES YOU', [
        '<font name="BodyBold">Optimized withdrawal</font> \u2014 The withdrawal order that minimizes your tax, year by year.',
        '<font name="BodyBold">QPP/OAS Optimizer</font> — The best claiming ages for your situation.',
        '<font name="BodyBold">Fee impact</font> — How much your current fees cost you in dollars over 30 years.',
        '<font name="BodyBold">Stress tests</font> — Crashes, inflation, longevity\u00a0: does your plan survive?',
        '<font name="BodyBold">Monte Carlo simulation</font> — 5\u202f000 scenarios. Not averages — your full distribution.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ PRINCIPES BUILDFI ═══
    story.append(InfoBox('goodtoknow', 'The 3 BuildFi principles', [
        '<font name="BodyBold">1. Safety before returns.</font> Un coussin d\'urgence solide vaut plus qu\'un rendement de 12\u00a0% on a fragile portfolio.',
        '<font name="BodyBold">2. Liquidity before tax optimization.</font> Cash you can access in an emergency comes before the perfect tax strategy.',
        '<font name="BodyBold">3. Simplicity before sophistication.</font> A simple plan you follow beats a complex plan you abandon.',
    ]))

    story.append(Spacer(1, 14))
    story.append(GoldRule(CW - 60, 0.5))
    story.append(Spacer(1, 6))

    # ═══ SOURCES ═══
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Sources</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Canada Revenue Agency (CRA): 2026 federal tax brackets, pension income credit, "
        "RRIF rules, CCA Class 1 (4% declining balance), RDTOH rules, SBD grind thresholds, "
        "capital gains inclusion rates (50%/66.67%). "
        "Service Canada: OAS amounts, clawback thresholds Q1 2026. "
        "Retraite Qu\u00e9bec: QPP actuarial adjustments 60/65/70, maximum pension 2026. "
        "Revenu Qu\u00e9bec: 2026 provincial brackets, combined SME corporate rates (12.2%), "
        "splitting credit, dividend gross-up. "
        "Morningstar Canada: average management fees (MER) of Canadian funds. "
        "Vanguard Canada: index ETF MERs (VBAL, VGRO). "
        "Guyton-Klinger (2006): dynamic withdrawal guardrails methodology. "
        "Fraser Smith (2002): Smith Manoeuvre \u2014 mechanism and legal framework. "
        "Canadian Life and Health Insurance Association (CLHIA): CPM 2023 mortality tables.", S['disclaimer']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Important notice</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "This guide is provided for informational and educational purposes only. It does not constitute "
        "personalized financial, tax, legal, or investment advice. The strategies described "
        "(RRSP meltdown, income splitting, Smith Manoeuvre, CCA, corporate extraction, pipeline) carry risks "
        "and tax implications that vary by situation. The figures and thresholds "
        "mentioned are based on data available for the 2026 tax year and could "
        "change. Consult a certified financial planner (CFP), a tax specialist, or a "
        "chartered professional accountant (CPA) before implementing any œadvanced strategy.", S['disclaimer']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("\u00a9 2026 BuildFi  \u2022  buildfi.ca  \u2022  All rights reserved.",
        ParagraphStyle('cr', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, alignment=TA_CENTER)))

    doc.build(story)
    return path

if __name__ == "__main__":
    p = build()
    print(f"Generated: {p}")
