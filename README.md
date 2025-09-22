# Shopping List Price Extractor

<img size=25% alt="ggIGA" src="https://github.com/user-attachments/assets/f8bd6a09-271f-4b5a-87c4-58d1fff708ab" />    

A Tampermonkey userscript that extracts item names, quantities, weight/vol., and prices from online grocery shopping trolleys and calculates the total cost.

## Features

- Extracts product names, quantities, sizes, and individual prices
- Calculates total cost across all items
- Displays results in a convenient popup overlay
- Copy shopping list to clipboard functionality

## Compatibility

- **Primary target**: The Good Grocer (IGA)
- **General support**: Any myfoodlink.com trolley pages

## Installation

1. Install [Tampermonkey browser extension](https://www.tampermonkey.net/)
2. Create a new userscript in Tampermonkey
3. Copy and paste the entire script code
4. Save the script

## Usage

1. Navigate to a supported grocery website's trolley/cart page
2. Add items to your trolley as normal
3. Click the "Extract Shopping List" button that appears in the top-right corner
4. If you add more/remove items while on the shopping basket page, click the refresh page button to update the extractor
5. View your itemised list with quantities, prices, and total cost
6. Use "Copy List" to copy the formatted shopping list to your clipboard

## Output Format

The extracted shopping list includes:
- Item name
- Quantity and unit price
- Calculated total per item
- Grand total for all items
  <img size=20% alt="image" src="https://github.com/user-attachments/assets/72eec2f1-e86e-44c7-8cc7-f9b46302c0d8" />  

## Technical Details

The script uses two extraction methods:
1. **Primary**: Parses embedded JSON order data from the page
2. **Fallback**: DOM element parsing using CSS selectors
