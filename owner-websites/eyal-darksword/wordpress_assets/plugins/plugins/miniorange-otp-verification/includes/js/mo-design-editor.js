/**
 * Design Editor Script
 * Handles popup design editor functionality including tab switching and AJAX operations
 */
(function($mo) {
    'use strict';

    /**
     * Initialize design editor functionality
     */
    function initDesignEditor() {
        if (typeof moDesignEditor === 'undefined') {
            return;
        }

        // Initialize design tab switching
        initDesignTabs();

        // Initialize popup editor functionality
        initPopupEditor();
    }

    /**
     * Initialize design tab item click handlers
     */
    function initDesignTabs() {
        $mo(".design-tab-item").click(function() {
            $mo(".design-tab-item").removeClass("active");
            $mo(this).addClass("active");
            const targetTab = $mo(this).attr("target-tab");
            $mo(".mo-tab-selector").hide();
            $mo("#" + targetTab).show();
        });
    }

    /**
     * Initialize popup editor functionality
     */
    function initPopupEditor() {
        // Append initial message to iframe
        if (moDesignEditor.message) {
            $mo("#advance_box iframe").contents().find("body").append(moDesignEditor.message);
        }

        // Handle popup button clicks
        $mo("input:button[id=popupbutton]").click(function() {
            var iframe = $mo(this).data("iframe");
            var nonce = $mo("input[name='popup_display_nonce']").val();
            var popupAction = $mo(this).data("popup");
            var popupType = $mo("form[name=" + iframe + "] input[name='popuptype']").val();
            var editorName = $mo("form[name=" + iframe + "] textarea").attr("name");
            var templatedata = $mo("form[name=" + iframe + "] textarea").val();

            // Confirm reset action
            if (popupAction === "mo_popup_reset" && confirm(moDesignEditor.resetConfirmText) === false) {
                return;
            }

            // Clear iframe and show loader
            $mo("#" + iframe).contents().find("body").empty();
            if (moDesignEditor.loaderHtml) {
                $mo("#" + iframe).contents().find("body").append(moDesignEditor.loaderHtml);
            }

            // Prepare AJAX data
            var data = {
                form_name: iframe,
                popactionvalue: popupAction,
                popuptype: popupType,
                _wpnonce: nonce,
                action: popupAction
            };
            data[editorName] = templatedata;

            // Make AJAX request
            $mo.ajax({
                url: moDesignEditor.ajaxUrl,
                type: "POST",
                data: data,
                crossDomain: true,
                dataType: "json",
                success: function(response) {
                    $mo("#" + iframe).contents().find("body").empty();
                    $mo("#" + iframe).contents().find("body").append(response.message);

                    // Handle reset action - response.message is an object with message and template properties.
                    if (popupAction === "mo_popup_reset") {
                        $mo("#" + iframe).contents().find("body").empty();
                        $mo("#" + iframe).contents().find("body").append(response.message["message"]);
                        $mo("#" + editorName).empty();
                        $mo("#" + editorName).val(response.message["template"]);
                    }
                },
                error: function(xhr, status, error) {
                    // Error handling if needed
                }
            });
        });
    }

    // Initialize when document is ready
    $mo(document).ready(function() {
        initDesignEditor();
    });

})(jQuery);

