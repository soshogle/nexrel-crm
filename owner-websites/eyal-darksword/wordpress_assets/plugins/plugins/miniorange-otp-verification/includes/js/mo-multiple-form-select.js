/**
 * Multiple Form Select Script
 * Handles dynamic addition and removal of form rows in admin settings
 */
(function($mo) {
    'use strict';

    /**
     * Initialize form handlers for multiple form select
     */
    function initMultipleFormSelect() {
        if (typeof moMultipleFormSelect === 'undefined' || !moMultipleFormSelect.forms) {
            return;
        }

        // Process each form configuration
        Object.keys(moMultipleFormSelect.forms).forEach(function(formName) {
            var formConfig = moMultipleFormSelect.forms[formName];
            setupFormHandlers(formName, formConfig);
        });
    }

    /**
     * Setup handlers for a specific form
     * @param {string} formName - The form name identifier
     * @param {object} config - Configuration object for the form
     */
    function setupFormHandlers(formName, config) {
        // Initialize counters
        window[formName + '_counter1'] = config.counters[0] || 0;
        window[formName + '_counter2'] = config.counters[1] || 0;
        window[formName + '_counter3'] = config.counters[2] || 0;

        // Create add function
        window['add_' + formName] = function(t, n) {
            const existingRows = $mo('[id^="row' + formName + n + '_"]');
            let maxIndex = -1;

            existingRows.each(function() {
                const id = $mo(this).attr('id');
                const match = id.match(new RegExp('row' + formName + '\\d+_(\\d+)'));
                if (match && match[1]) {
                    const index = parseInt(match[1], 10);
                    maxIndex = Math.max(index, maxIndex);
                }
            });

            const newIndex = maxIndex + 1;
            let hidden1 = '', hidden2 = '', both = '';
            if (n === 1) hidden2 = 'hidden';
            if (n === 2) hidden1 = 'hidden';
            if (n === 3) both = 'both_';

            let html = config.rowTemplate;
            html = html.replace(/{KEY}/g, n)
                      .replace(/{INDEX}/g, newIndex)
                      .replace(/{HIDDEN1}/g, hidden1)
                      .replace(/{HIDDEN2}/g, hidden2);

            const lastDivIndex = html.lastIndexOf('</div>');
            if (lastDivIndex !== -1) {
                const removeRow = config.removeRowTemplate.replace(/{FORM}/g, formName);
                html = html.slice(0, lastDivIndex) + removeRow + html.slice(lastDivIndex + 6);
            }

            const targetElement = existingRows.last();
            if (targetElement.length) {
                $mo(html).insertAfter(targetElement);
            }

            window[formName + '_counter' + n] = existingRows.length + 1;
            if (existingRows.length + 1 === 2) {
                const firstRow = $mo('[id^="row' + formName + n + '_"]').first();
                firstRow.find('.mo-form-button.secondary').remove();
                const removeRow = config.removeRowTemplate.replace(/{FORM}/g, formName);
                firstRow.append(removeRow);
            }
        };

        // Create remove function
        window['removeSpecific_' + formName] = function(button) {
            var row = $mo(button).closest('.flex');
            var id = row.attr('id');
            var match = id.match(new RegExp('row' + formName + '(\\d+)_(\\d+)'));

            const existingRows = $mo('[id^="row' + formName + '1_"]');
            var count = Math.max(
                window[formName + '_counter1'] || 0,
                window[formName + '_counter2'] || 0,
                window[formName + '_counter3'] || 0,
                existingRows.length
            );

            if (match) {
                const index = parseInt(match[2], 10);
                row.remove();
                $mo('#row' + formName + '1_' + index).remove();
                $mo('#row' + formName + '2_' + index).remove();
                $mo('#row' + formName + '3_' + index).remove();
            }
            count--;
            window[formName + '_counter3'] = window[formName + '_counter1'] = window[formName + '_counter2'] = count;

            if (count === 1) {
                $mo('.mo-remove-btn').remove();
            }
        };
    }

    // Initialize when document is ready
    $mo(document).ready(function() {
        initMultipleFormSelect();
    });

})(jQuery);

