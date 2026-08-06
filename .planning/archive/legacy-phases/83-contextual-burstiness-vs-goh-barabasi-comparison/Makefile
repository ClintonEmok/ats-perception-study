.PHONY: reproduce clean install

reproduce:
	.venv/bin/python run.py

clean:
	rm -rf output/contextual_metric.parquet output/goh_barabasi_metric.parquet output/comparison_table.csv
	rm -rf output/figures/*.png output/DECISION-GATE.md

install:
	# Deviation: homebrew Python on this host has a broken libexpat link
	# (missing _XML_SetAllocTrackerActivationThreshold), so `python3 -m venv`
	# + `ensurepip` fails. `uv` is the cleanest path to a working venv.
	uv venv .venv --python 3.11
	.venv/bin/python -m ensurepip --upgrade || .venv/bin/python <(curl -sS https://bootstrap.pypa.io/get-pip.py)
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
