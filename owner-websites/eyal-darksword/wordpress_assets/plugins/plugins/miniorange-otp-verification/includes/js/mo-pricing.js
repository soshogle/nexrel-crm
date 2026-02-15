/**
 * Pricing Page Script
 * Handles tab switching, form submission, and page navigation for the pricing page
 */
(function($mo) {
    'use strict';

    /**
     * Make functions globally available for onclick handlers
     * These need to be available immediately, not just on document ready
     */
    function makeFunctionsGlobal() {
        // Submit upgrade form
        window.mo_otp_upgradeform_submit = function(planType) {
            $mo("input[name='requestOrigin']").val(planType);
            $mo("#mo_upgrade_form").submit();
        };

        // Show pricing plans
        window.mo_otp_show_plans = function() {
            $mo("#mo_otp_plans_pricing_table").show();
            $mo("#mo_otp_miniorange_gateway_pricing").hide();
            $mo("#mo_otp_show_monthly_plan").hide();
        };

        // Show miniOrange gateway pricing
        window.mo_otp_show_mo_gateway = function() {
            $mo("#premium_addons").prop("checked", true);
            $mo("#mo_otp_miniorange_gateway_pricing").show();
            $mo("#mo_otp_plans_pricing_table").hide();
            $mo("#mo_otp_show_monthly_plan").hide();
        };

        // Show monthly plan
        window.mo_otp_show_monthly_plan = function() {
            $mo("#monthly_plan").prop("checked", true);
            $mo("#mo_otp_miniorange_gateway_pricing").hide();
            $mo("#mo_otp_plans_pricing_table").hide();
            $mo("#mo_otp_show_monthly_plan").show();
        };

        // Get monthly plan data and contact support
        window.mo_get_montly_plan_data = function() {
            var monthly_sms = $mo("#mo_monthly_sms").val();
            var monthly_email = $mo("#mo_monthly_email").val();
            var monthly_country = $mo("#mo_country_code option:selected").text();
            var queryBody = "Hi! I am interested in the miniOrange monthly subscription module, My target country is monthly_country, Please provide a quote for monthly_sms SMS and monthly_email Emails per month.";
            var mapObj = {
                monthly_country: monthly_country,
                monthly_sms: monthly_sms,
                monthly_email: monthly_email
            };
            var queryReplaced = queryBody.replace(/monthly_country|monthly_sms|monthly_email/gi, function(matched) {
                return mapObj[matched];
            });
            if (typeof otpSupportOnClick !== 'undefined') {
                otpSupportOnClick(queryReplaced);
            }
        };
    }

    /**
     * Initialize pricing page functionality
     */
    function initPricingPage() {
        // Tab switching functionality
        initTabSwitching();

        // Initialize page based on URL parameters
        initPageFromUrl();
    }

    /**
     * Initialize tab switching between pricing plans and miniOrange gateway
     */
    function initTabSwitching() {
        const pricingPage = document.getElementById("mo_otp_plans_pricing_table");
        const addonsPage = document.getElementById("mo_otp_miniorange_gateway_pricing");
        const pricingTabItem = document.getElementById("pricingtabitem");
        const mogatewaytabitem = document.getElementById("mogatewaytabitem");

        if (!pricingPage || !addonsPage || !pricingTabItem || !mogatewaytabitem) {
            return;
        }

        mogatewaytabitem.addEventListener("click", function() {
            addonsPage.style.display = "block";
            pricingPage.style.display = "none";
            mogatewaytabitem.classList.add("active");
            pricingTabItem.classList.remove("active");
        });

        pricingTabItem.addEventListener("click", function() {
            addonsPage.style.display = "none";
            pricingPage.style.display = "block";
            pricingTabItem.classList.add("active");
            mogatewaytabitem.classList.remove("active");
        });
    }

    /**
     * Initialize page display based on URL parameters
     */
    function initPageFromUrl() {
        var subPage = window.location.href.split("subpage=")[1];
        if (subPage !== "undefined") {
            if (subPage === "mogateway") {
                mo_otp_show_mo_gateway();
            }
        }
    }

    // Make functions globally available immediately (before document ready)
    makeFunctionsGlobal();

    // Initialize when document is ready
    $mo(document).ready(function() {
        initPricingPage();
    });

})(jQuery);

