// ==UserScript==
// @name         Shopping List Price Extractor
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Extract item names, quantities, prices and calculate total from shopping lists
// @author       You
// @match        https://thegoodgrocereastfremantle.myfoodlink.com/trolley*
// @match        *://*.myfoodlink.com/trolley*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Function to extract shopping list data
    function extractShoppingListData() {
        const items = [];
        let totalPrice = 0;
        const seenItems = new Set();

        // First try to get data from the page's embedded JSON
        try {
            const orderDataScript = document.querySelector('body[data-order]');
            if (orderDataScript) {
                const orderData = JSON.parse(orderDataScript.getAttribute('data-order'));
                if (orderData && orderData.lines && Array.isArray(orderData.lines)) {
                    orderData.lines.forEach(line => {
                        if (!line.deleted) {
                            const itemKey = line.plu || line.line_text;
                            if (!seenItems.has(itemKey)) {
                                seenItems.add(itemKey);

                                const sizeMatch = line.line_text.match(/(\d+(?:\.\d+)?(?:kg|g|ml|l|gm)\b)/i);
                                const size = sizeMatch ? sizeMatch[1] : '';

                                let cleanName = line.line_text;
                                if (sizeMatch) {
                                    cleanName = line.line_text.replace(sizeMatch[0], '').trim();
                                }

                                const priceValue = parseFloat(line.line_price.replace('$', ''));
                                const quantity = line.line_quantity;

                                items.push({
                                    name: cleanName,
                                    quantity: quantity,
                                    size: size,
                                    price: line.line_price,
                                    priceValue: priceValue,
                                    totalItemPrice: (priceValue * quantity).toFixed(2)
                                });

                                totalPrice += (priceValue * quantity);
                            }
                        }
                    });

                    if (items.length > 0) {
                        return {
                            items: items,
                            totalPrice: totalPrice.toFixed(2)
                        };
                    }
                }
            }
        } catch (e) {
            console.log('Could not parse embedded order data, falling back to DOM parsing');
        }

        // Fallback: DOM parsing with duplicate prevention
        const listItems = document.querySelectorAll('.ln__main, [class*="item"], [class*="product"]');

        listItems.forEach(item => {
            try {
                let name = '';
                const nameSelectors = ['.ln__name span:first-child', '.ln__name', '[class*="name"]', '[class*="title"]'];

                for (const selector of nameSelectors) {
                    const nameElement = item.querySelector(selector);
                    if (nameElement && nameElement.textContent.trim()) {
                        name = nameElement.textContent.trim();
                        break;
                    }
                }

                if (seenItems.has(name)) return;
                seenItems.add(name);

                let size = '';
                const sizeSelectors = ['.ln__name .size', '.size', '[class*="size"]'];

                for (const selector of sizeSelectors) {
                    const sizeElement = item.querySelector(selector);
                    if (sizeElement && sizeElement.textContent.trim()) {
                        size = sizeElement.textContent.trim();
                        break;
                    }
                }

                let quantity = 1;
                const quantityInput = item.querySelector('[data-quantity-input]');
                if (quantityInput) {
                    try {
                        const dataAttr = quantityInput.getAttribute('data-quantity-input');
                        const quantityData = JSON.parse(dataAttr.replace(/&quot;/g, '"'));
                        if (quantityData.quantity) {
                            quantity = quantityData.quantity;
                        }
                    } catch (e) {
                        const input = quantityInput.querySelector('.qi-input');
                        if (input && input.value) {
                            quantity = parseFloat(input.value) || 1;
                        }
                    }
                }

                let price = '';
                let priceValue = 0;
                const priceSelectors = ['.ln__desc .item-per-unit-cost', '.ln__total', '[class*="price"]', '[data-line-total]'];

                for (const selector of priceSelectors) {
                    const priceElement = item.querySelector(selector);
                    if (priceElement && priceElement.textContent.includes('$')) {
                        price = priceElement.textContent.trim();
                        const match = price.match(/\$([0-9]+\.?[0-9]*)/);
                        if (match) {
                            priceValue = parseFloat(match[1]);
                        }
                        break;
                    }
                }

                if (name && price) {
                    items.push({
                        name: name,
                        quantity: quantity,
                        size: size,
                        price: price,
                        priceValue: priceValue,
                        totalItemPrice: (priceValue * quantity).toFixed(2)
                    });
                    totalPrice += (priceValue * quantity);
                }
            } catch (error) {
                console.log('Error processing item:', error);
            }
        });

        return {
            items: items,
            totalPrice: totalPrice.toFixed(2)
        };
    }

    // Function to display results in popup
    function displayResultsPopup(data) {
        const existing = document.getElementById('shopping-extractor-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'shopping-extractor-popup';
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;max-width:90vw;max-height:80vh;background:white;border:2px solid #ddd;border-radius:10px;box-shadow:rgb(67 28 0 / 90%) 0px 0px 15px 12px;;z-index:10001;font-family:Arial,sans-serif;overflow:hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'background:#f5f5f5;padding:15px;border-bottom:1px solid #ddd;';

        const title = document.createElement('h3');
        title.style.cssText = 'margin:0;color:#333;';
        title.textContent = 'Shopping List (' + data.items.length + ' items)';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-popup';
        closeBtn.style.cssText = 'float:right;margin-top:-30px;background:none;border:none;font-size:20px;cursor:pointer;';
        closeBtn.textContent = '×';

        header.appendChild(title);
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.style.cssText = 'max-height:400px;overflow-y:auto;padding:15px;';

        data.items.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'margin-bottom:15px;padding:10px;border:1px solid #eee;border-radius:5px;';

            const nameSpan = document.createElement('strong');
            nameSpan.textContent = item.name;

            const sizeText = item.size ? ' (' + item.size + ')' : '';
            const detailsSpan = document.createElement('span');
            detailsSpan.style.cssText = 'color:#666;';
            detailsSpan.textContent = 'Qty: ' + item.quantity + ' × ' + item.price + ' = $' + item.totalItemPrice;

            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(document.createTextNode(sizeText));
            itemDiv.appendChild(document.createElement('br'));
            itemDiv.appendChild(detailsSpan);

            content.appendChild(itemDiv);
        });

        const footer = document.createElement('div');
        footer.style.cssText = 'background:#f5f5f5;padding:15px;border-top:1px solid #ddd;';

        const totalSpan = document.createElement('strong');
        totalSpan.style.cssText = 'font-size:18px;';
        totalSpan.textContent = 'Total: $' + data.totalPrice;

        const copyListBtn = document.createElement('button');
        copyListBtn.id = 'copy-list';
        copyListBtn.style.cssText = 'float:right;background:#572700;color:#fff;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;';
        copyListBtn.textContent = 'Copy List';

        footer.appendChild(totalSpan);
        footer.appendChild(copyListBtn);

        popup.appendChild(header);
        popup.appendChild(content);
        popup.appendChild(footer);
        document.body.appendChild(popup);

        // Event listeners
        closeBtn.addEventListener('click', function() { popup.remove(); });



        copyListBtn.addEventListener('click', function() {
            let listText = 'Shopping List (' + data.items.length + ' items)\n\n';
            data.items.forEach(function(item, index) {
                listText += (index + 1) + '. ' + item.name;
                if (item.size) listText += ' (' + item.size + ')';
                listText += '\n   Qty: ' + item.quantity + ' × ' + item.price + ' = $' + item.totalItemPrice + '\n\n';
            });
            listText += 'Total: $' + data.totalPrice;

            navigator.clipboard.writeText(listText).then(function() {
                alert('Shopping list copied to clipboard!');
            });
        });

        popup.addEventListener('click', function(e) {
            if (e.target === popup) popup.remove();
        });
    }

    // Function to create extraction button
    function createExtractionButton() {
        const button = document.createElement('button');
        button.innerHTML = 'Extract Shopping List';
        button.style.cssText = 'position:fixed;top:7.7rem;right:3rem;z-index:10000;background:#572700;color:#fff;border:none;padding:0 9px;border-radius:var(--account-bar-trolley-button-border-radius,5px);cursor:pointer;font-size:14px;box-shadow:0 2px 5px rgba(0,0,0,0.2);height:40px;line-height:40px;';

        button.addEventListener('click', function() {
            const data = extractShoppingListData();
            displayResultsPopup(data);
        });

        document.body.appendChild(button);
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            createExtractionButton();
        });
    } else {
        createExtractionButton();
    }

})();
