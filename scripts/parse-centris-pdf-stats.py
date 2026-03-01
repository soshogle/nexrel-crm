#!/usr/bin/env python3
"""
Parse Centris monthly statistics PDFs and output JSON for DB import.

These PDFs have ~1,500 pages covering every municipality in Quebec by property type.
We extract text from each page and parse the structured data.

Usage:
  python3 scripts/parse-centris-pdf-stats.py [--file=FILE] [--region=FILTER] [--out=output.json]
  
  Defaults to the latest PDF in data/market-reports/.
  --region filters to municipalities containing the string (e.g. "Montréal").
"""

import pdfplumber
import json
import re
import sys
import os
import glob
from pathlib import Path

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'market-reports')

PROPERTY_CATEGORIES = {
    'Single Family': 'Single Family',
    'Bungalow': 'Single Family',
    'Two or more storey': 'Single Family',
    'Split-level': 'Single Family',
    'One-and-a-half-storey': 'Single Family',
    'Mobile home': 'Mobile Home',
    'Condo/Apt.': 'Condo/Apt',
    'Revenue Prop.': 'Revenue Property',
    'Duplex': 'Revenue Property',
    'Triplex': 'Revenue Property',
    'Quadruplex': 'Revenue Property',
    'Quintuplex+': 'Revenue Property',
    'Farm/Hobby Farm': 'Farm',
    'Land/Lot': 'Land',
    'Lot': 'Land',
    'Com./Ind./Block': 'Commercial',
    'Commercial': 'Commercial',
    'Industrial': 'Commercial',
}

def parse_number(s):
    """Parse a number from a string, handling commas."""
    if not s or s.strip() == '0' or s.strip() == '':
        return 0
    s = s.replace(',', '').replace('$', '').strip()
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return 0

def parse_page_text(text):
    """Extract municipality and stats from a page's text content."""
    if not text or len(text) < 100:
        return None
    
    # Must be a data page
    if 'Centris® Statistics' not in text:
        return None
    
    lines = text.split('\n')
    
    # Extract region (line after "Centris® Statistics...")
    region = None
    municipality = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith('Centris® Statistics'):
            continue
        if not region and line and len(line) > 2 and not line.startswith('Listing') and not line.startswith('New') and not line.startswith('Janurary') and not line.startswith('January') and not line.startswith('February') and not line.startswith('March') and not line.startswith('April') and not line.startswith('May') and not line.startswith('June') and not line.startswith('July') and not line.startswith('August') and not line.startswith('September') and not line.startswith('October') and not line.startswith('November') and not line.startswith('December') and not line.startswith('Revised') and not line.startswith('Page') and not line.startswith('Days') and not line.startswith('(%)'):
            if not region:
                region = line
            elif not municipality:
                municipality = line
                break
    
    if not region:
        return None
    
    # Parse the property type rows from text
    results = []
    
    # Match lines like: "Single Family 5 24 0 0 0 0 0 0 0 4 20 5 1,587,000 104 317,400 330,000 95 115"
    for line in lines:
        line = line.strip()
        for prop_type in PROPERTY_CATEGORIES:
            if line.startswith(prop_type):
                remaining = line[len(prop_type):].strip()
                nums = remaining.split()
                if len(nums) >= 9:
                    # Current period: new_list, active, sales, volume, dom, avg_price, median_price, vs_list, vs_assess
                    # The exact positions depend on whether current month has data
                    result = {
                        'region': region,
                        'municipality': municipality,
                        'property_type': prop_type,
                        'property_category': PROPERTY_CATEGORIES[prop_type],
                        'raw_numbers': nums,
                    }
                    
                    try:
                        # First pair: new listings, active listings (current period)
                        result['new_listings'] = parse_number(nums[0])
                        result['active_listings'] = parse_number(nums[1])
                        
                        # Sales: number, volume
                        result['num_sales'] = parse_number(nums[2])
                        
                        if result['num_sales'] > 0 and len(nums) >= 9:
                            # volume might be next or might be merged
                            vol_idx = 3
                            result['volume'] = parse_number(nums[vol_idx])
                            result['dom_avg'] = parse_number(nums[vol_idx + 1])
                            result['avg_sale_price'] = parse_number(nums[vol_idx + 2])
                            result['median_sale_price'] = parse_number(nums[vol_idx + 3])
                            if len(nums) > vol_idx + 4:
                                result['sale_vs_list_pct'] = parse_number(nums[vol_idx + 4])
                            if len(nums) > vol_idx + 5:
                                result['sale_vs_assess_pct'] = parse_number(nums[vol_idx + 5])
                        else:
                            result['volume'] = 0
                            result['dom_avg'] = 0
                            result['avg_sale_price'] = 0
                            result['median_sale_price'] = 0
                    except (IndexError, ValueError):
                        pass
                    
                    results.append(result)
                break
    
    return results if results else None

def extract_period_from_filename(filename):
    """Extract year/month from filename like pdf_en_statistics_STATS_MUNGENRE_202601N.pdf"""
    match = re.search(r'(\d{4})(\d{2})[NO]\.pdf$', filename)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None

def main():
    args = {a.split('=')[0].lstrip('-'): a.split('=')[1] if '=' in a else True 
            for a in sys.argv[1:]}
    
    region_filter = args.get('region', None)
    out_file = args.get('out', 'data/market-reports/centris-parsed-stats.json')
    
    if 'file' in args:
        pdf_files = [args['file']]
    else:
        # Get the latest N.pdf (new listings report)
        pattern = os.path.join(DATA_DIR, 'pdf_en_statistics_STATS_MUNGENRE_*N.pdf')
        pdf_files = sorted(glob.glob(pattern))[-1:]  # Latest only
    
    if not pdf_files:
        print("No PDF files found.")
        sys.exit(1)
    
    all_records = []
    
    for pdf_file in pdf_files:
        filename = os.path.basename(pdf_file)
        year, month = extract_period_from_filename(filename)
        if not year:
            print(f"Cannot parse date from {filename}, skipping.")
            continue
        
        print(f"Parsing {filename} ({year}-{month:02d})...")
        pdf = pdfplumber.open(pdf_file)
        total_pages = len(pdf.pages)
        parsed_pages = 0
        parsed_records = 0
        
        for page_idx in range(total_pages):
            if page_idx % 200 == 0:
                print(f"  Page {page_idx}/{total_pages}...")
            
            page = pdf.pages[page_idx]
            text = page.extract_text()
            if not text:
                continue
            
            results = parse_page_text(text)
            if not results:
                continue
            
            for r in results:
                # Apply region filter
                if region_filter:
                    combined = f"{r.get('region','')} {r.get('municipality','')}"
                    if region_filter.lower() not in combined.lower():
                        continue
                
                record = {
                    'year': year,
                    'month': month,
                    'region': r['region'],
                    'municipality': r.get('municipality', ''),
                    'property_category': r['property_category'],
                    'property_type': r['property_type'],
                    'new_listings': r.get('new_listings', 0),
                    'active_listings': r.get('active_listings', 0),
                    'num_sales': r.get('num_sales', 0),
                    'volume': r.get('volume', 0),
                    'dom_avg': r.get('dom_avg', 0),
                    'avg_sale_price': r.get('avg_sale_price', 0),
                    'median_sale_price': r.get('median_sale_price', 0),
                    'sale_vs_list_pct': r.get('sale_vs_list_pct', 0),
                    'source_file': filename,
                }
                all_records.append(record)
                parsed_records += 1
            
            parsed_pages += 1
        
        pdf.close()
        print(f"  Parsed {parsed_pages} data pages, {parsed_records} records from {filename}")
    
    # Write output
    output_path = out_file if os.path.isabs(out_file) else os.path.join(os.path.dirname(__file__), '..', out_file)
    with open(output_path, 'w') as f:
        json.dump(all_records, f, indent=2)
    
    print(f"\nTotal records: {len(all_records)}")
    print(f"Output: {output_path}")
    
    # Summary
    regions = set(r['region'] for r in all_records)
    cats = set(r['property_category'] for r in all_records)
    print(f"Regions: {len(regions)}")
    print(f"Categories: {cats}")
    
    # Show top municipalities by sales volume
    muni_sales = {}
    for r in all_records:
        key = r.get('municipality') or r['region']
        muni_sales[key] = muni_sales.get(key, 0) + r.get('num_sales', 0)
    top = sorted(muni_sales.items(), key=lambda x: -x[1])[:15]
    print(f"\nTop 15 municipalities by sales:")
    for name, count in top:
        print(f"  {name}: {count}")

if __name__ == '__main__':
    main()
