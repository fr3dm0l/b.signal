#!/usr/bin/env python3
"""b.signal Dossier PDF Generator — WeasyPrint + Jinja2"""

import os
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from weasyprint.text.fonts import FontConfiguration

from dummy_data import DOSSIER_META, SIGNALE, RADAR


def generate_dossier(output_filename: str = None):
    base_dir = Path(__file__).parent.resolve()
    templates_dir = base_dir / "templates"
    static_dir = base_dir / "static"
    output_dir = base_dir / "output"
    output_dir.mkdir(exist_ok=True)

    if output_filename is None:
        sektor_code = DOSSIER_META["sektor_code"].lower()
        kw = DOSSIER_META["kw_num"]
        year = DOSSIER_META["year"]
        output_filename = f"bsignal-{sektor_code}-kw{kw}-{year}.pdf"

    # Sort signals: hoch first, then mittel
    relevanz_order = {"hoch": 0, "mittel": 1, "niedrig": 2}
    sorted_signale = sorted(SIGNALE, key=lambda s: relevanz_order.get(s["relevanz"], 9))

    # Render Jinja2 template
    env = Environment(loader=FileSystemLoader(str(templates_dir)))
    template = env.get_template("dossier.html")

    css_path = (static_dir / "dossier.css").as_uri()

    html_content = template.render(
        meta=DOSSIER_META,
        signale=sorted_signale,
        radar=RADAR,
        css_path=css_path,
    )

    # Generate PDF
    font_config = FontConfiguration()
    output_path = output_dir / output_filename

    html = HTML(
        string=html_content,
        base_url=str(base_dir),
    )
    html.write_pdf(
        str(output_path),
        font_config=font_config,
    )

    file_size = output_path.stat().st_size
    print(f"PDF generated: {output_path}")
    print(f"File size: {file_size / 1024:.1f} KB ({file_size / (1024*1024):.2f} MB)")

    return output_path


if __name__ == "__main__":
    generate_dossier()
