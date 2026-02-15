/**
 * OTP Spam Preventer - Popup Timer Handler
 * 
 * This script handles cooldown and blocking for OTP verification popups.
 * 
 * HOW IT WORKS:
 * - Loaded via 'mo_include_js' action hook when popup is rendered
 * - Script runs INSIDE the popup HTML (popup is guaranteed to exist)
 * - Automatically detects popup type (default or error) and handles accordingly
 * 
 * POPUP TYPES:
 * 1. Default Popup: Has form #mo_validate_form
 *    - Checks block status via AJAX
 *    - Replaces "Resend OTP" link with countdown timer if blocked
 * 
 * 2. Error Popup: No form, just error message
 *    - Parses error message for timer (e.g., "10:45 minutes")
 *    - Updates timer dynamically in the error message
 * 
 * @package otpspampreventer
 */

(function($mo) {
    'use strict';

    // Popup selectors
    const POPUP_MODAL_ID = '#mo_site_otp_form';
    const DEFAULT_FORM_ID = '#mo_validate_form';
    const POPUP_BODY_CLASS = '.mo_customer_validation-modal-body';
    const MESSAGE_DIV_ID = '#mo_message';
    
    // Get browser ID from localStorage or generate new one
    let currentBrowserID = localStorage.getItem('mo_osp_browser_id');
    if (!currentBrowserID) {
        currentBrowserID = generateBrowserID();
        localStorage.setItem('mo_osp_browser_id', currentBrowserID);
    }

    /**
     * Generate unique browser ID
     */
    function generateBrowserID() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Determine popup type (default or error)
     */
    function getPopupType() {
        // If form exists, it's a default popup
        if ($mo(DEFAULT_FORM_ID).length > 0) {
            return 'default';
        }
        // Otherwise it's an error popup
        return 'error';
    }

    /**
     * Handle default popup - check if user is blocked and show timer
     */
    function handleDefaultPopup() {
        
        // PERFORMANCE FIX: Check if initial cooldown data is available (eliminates AJAX delay)
        if (typeof mo_osp_popup_timer.initial_cooldown_time !== 'undefined' && 
            mo_osp_popup_timer.initial_cooldown_time > 0) {
            replaceResendButtonWithTimer(mo_osp_popup_timer.initial_cooldown_time);
            return;
        }
        
        if (typeof mo_osp_popup_timer.initial_blocked !== 'undefined' && 
            mo_osp_popup_timer.initial_blocked) {
        }
        
        const email = getEmailFromForm();
        const phone = getPhoneFromForm();


        $mo.ajax({
            url: mo_osp_popup_timer.ajax_url,
            type: 'POST',
            data: {
                action: 'mo_osp_check_blocked',
                nonce: mo_osp_popup_timer.nonce,
                mo_osp_browser_id: currentBrowserID,
                email: email,
                phone: phone
            },
            success: function(response) {
                
                if (response.blocked || response.cooldown) {
                    // User is blocked or on cooldown, replace resend button with timer
                    const timeLeft = response.remaining_time;
                    
                    replaceResendButtonWithTimer(timeLeft);
                }   
            },
            error: function(xhr, status, error) {
            }
        });
    }

    /**
     * Handle error popup - parse message for timer information or puzzle requirement
     */
    function handleErrorPopup() {
        
        const $mopopupBody = $mo(POPUP_BODY_CLASS);
        const messageText = $mopopupBody.text().trim();
        
        
        // Check if puzzle verification is required
        const puzzleRequiredText = (window.mo_osp_popup_timer && window.mo_osp_popup_timer.puzzle_required_text) || 'Please complete the security verification to continue';
        if (messageText.includes(puzzleRequiredText)) {
            $mo(POPUP_MODAL_ID).hide();
            $mo('.mo_customer_validation-modal').hide();
            $mo('.mo-modal-backdrop').hide();
            $mo('#mo-osp-puzzle-popup-outer-div').show();
            $mo('#mo-osp-puzzle-overlay').removeClass('mo-osp-hidden');
            handlePuzzleVerification();
            return;
        }
        
        // Try to extract time from message (e.g., "10:45 minutes" or "645 seconds")
        const timerMatch = extractTimerFromMessage(messageText);
        
        if (timerMatch) {
            displayErrorTimer(timerMatch, $mopopupBody);
        }   
    }

    /**
     * Handle puzzle verification requirement
     */
    function handlePuzzleVerification() {
        
        // Check if puzzle system is available
        if (typeof window.MO_OSP_Puzzle === 'undefined') {
            return;
        }
        
        // Set up callback for when puzzle is completed
        window.MO_OSP_Puzzle_onPopupSuccess = function() {
            resendOTPAfterPuzzle();
        };
        
        // Trigger the puzzle modal
        window.MO_OSP_Puzzle.showPuzzle({});
    }
    
    /**
     * Go back to form after puzzle verification
     */
    function resendOTPAfterPuzzle() {
        
        // Check if resend form exists (DefaultPopup has it)
        const resendForm = document.getElementById('verification_resend_otp_form');
        
        if (resendForm) {
            // DefaultPopup - submit resend form directly
            // Add puzzle verification flag if not already present
            if (!resendForm.querySelector('input[name="puzzle_verified"]')) {
                const puzzleVerifiedInput = document.createElement('input');
                puzzleVerifiedInput.type = 'hidden';
                puzzleVerifiedInput.name = 'puzzle_verified';
                puzzleVerifiedInput.value = 'true';
                resendForm.appendChild(puzzleVerifiedInput);
            }
            resendForm.submit();
        } else {
            // ErrorPopup or no form - reload page to go back to original form
            // User has been unblocked on the backend, just set success flag
            sessionStorage.setItem('mo_osp_puzzle_completed', 'true');
            
            // Reload the page to show the original form
            window.location.reload();
        }
    }

    /**
     * Extract timer value from error message
     */
    function extractTimerFromMessage(message) {
        // Pattern 1: "10:45 minutes" or "10:45 mins"
        const minuteSecondMatch = message.match(/(\d+):(\d+)\s*(?:minute|min)/i);
        if (minuteSecondMatch) {
            const minutes = parseInt(minuteSecondMatch[1], 10);
            const seconds = parseInt(minuteSecondMatch[2], 10);
            return (minutes * 60) + seconds;
        }
        
        // Pattern 2: "10 minutes" or "10 mins"
        const minuteMatch = message.match(/(\d+)\s*(?:minute|min)/i);
        if (minuteMatch) {
            return parseInt(minuteMatch[1], 10) * 60;
        }
        
        // Pattern 3: "645 seconds" or "645 secs"
        const secondMatch = message.match(/(\d+)\s*(?:second|sec)/i);
        if (secondMatch) {
            return parseInt(secondMatch[1], 10);
        }
        
        return null;
    }

    /**
     * Replace resend OTP button with countdown timer
     */
    function replaceResendButtonWithTimer(timeLeft) {
        // Find resend link/button (it's added via onclick="mo_otp_verification_resend()")
        const $moresendLink = $mo('a.mo-resend, a[onclick*="mo_otp_verification_resend"]');
        
        if ($moresendLink.length === 0) {
            return;
        }

        // Hide the resend link
        $moresendLink.hide();

        // Create timer display element
        const timerId = 'mo_osp_popup_timer_display';
        if ($mo('#' + timerId).length === 0) {
            $moresendLink.after('<div id="' + timerId + '" style="color: #d93025; font-size: 16px; font-weight: 600; margin-top: 10px;"></div>');
        }

        const $motimerDisplay = $mo('#' + timerId);
        let remainingTime = timeLeft;

        // Start countdown
        const intervalId = setInterval(function() {
            const minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
            const seconds = String(remainingTime % 60).padStart(2, '0');

            // Just show the countdown timer
            $motimerDisplay.text(minutes + ':' + seconds);

            if (remainingTime <= 0) {
                clearInterval(intervalId);
                $motimerDisplay.remove();
                $moresendLink.show();
            }

            remainingTime--;
        }, 1000);
    }

    /**
     * Display timer in error popup (updates the existing message)
     */
    function displayErrorTimer(timeLeft, $mopopupBody) {
        const originalMessage = $mopopupBody.html();
        let remainingTime = timeLeft;

        // Extract base message without timer
        let baseMessage = originalMessage;
        // Remove any existing timer patterns to get clean base message
        baseMessage = baseMessage.replace(/\d+:\d+\s*(?:minutes?|mins?)/gi, '__TIMER__')
                                 .replace(/\d+\s*(?:minutes?|mins?)/gi, '__TIMER__')
                                 .replace(/\d+\s*(?:seconds?|secs?)/gi, '__TIMER__');

        // Update immediately on first call
        updateTimerDisplay();

        // Start countdown
        const intervalId = setInterval(function() {
            remainingTime--;
            
            if (remainingTime < 0) {
                clearInterval(intervalId);
                
                // Call go back function to close popup
                if (typeof mo_validation_goback === 'function') {
                    mo_validation_goback();
                }   
                return;
            }

            updateTimerDisplay();
        }, 1000);

        function updateTimerDisplay() {
            const minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
            const seconds = String(remainingTime % 60).padStart(2, '0');
            const timeString = minutes + ':' + seconds;

            // Replace timer placeholder with current time
            const updatedMessage = baseMessage.replace(/__TIMER__/g, timeString + ' minutes');
            
            $mopopupBody.html(updatedMessage);
        }
    }

    /**
     * Get email from form fields
     */
    function getEmailFromForm() {
        let email = '';
        $mo('input[type="email"], input[name*="email"], input[id*="email"]').each(function() {
            if ($mo(this).val()) {
                email = $mo(this).val();
                return false;
            }
        });
        
        // If no email, use phone as identifier
        if (!email) {
            email = getPhoneFromForm();
        }
        
        return email;
    }

    /**
     * Get phone from form fields
     */
    function getPhoneFromForm() {
        let phone = '';
        $mo('input[type="tel"], input[name*="phone"], input[id*="phone"], input[name*="mobile"]').each(function() {
            if ($mo(this).val()) {
                phone = $mo(this).val();
                return false;
            }
        });
        return phone;
    }

    /**
     * Handle popup button click with blocking check (for button-triggered popups)
     */
    function handleButtonTriggeredPopup(hideSelector, resendButtonSelector) {
        const email = getEmailFromForm();
        const phone = getPhoneFromForm();


        $mo.ajax({
            url: mo_osp_popup_timer.ajax_url,
            type: 'POST',
            data: {
                action: 'mo_osp_check_blocked',
                nonce: mo_osp_popup_timer.nonce,
                mo_osp_browser_id: currentBrowserID,
                email: email,
                phone: phone
            },
            success: function(response) {

                const $moresendButton = $mo(resendButtonSelector);

                if (response.blocked || response.cooldown) {
                    // User is blocked or on cooldown, show timer
                    const timeLeft = response.remaining_time;
                    
                    
                    if ($moresendButton.length > 0) {
                        popUpButtonTimer(hideSelector, timeLeft );
                    } else {
                        $mo(hideSelector).show();
                    }
                } else {
                    // User not blocked, show resend button
                    if ($moresendButton.length > 0) {
                        $moresendButton.show();
                    } else {
                        $mo(hideSelector).show();
                    }
                }
            },
            error: function(xhr, status, error) {
                // On error, show the button
                $mo(resendButtonSelector).show();
            }
        });
    }

    /**
     * Display countdown timer in popup (for button-triggered popups)
     */
    function popUpButtonTimer(hideSelector, timeLeftUnblock, message) {
        const display = document.querySelector("#otpTimer");
        const $mohideSelector = $mo(hideSelector);

        
        // Hide resend button
        $mohideSelector.hide();

        let timer = timeLeftUnblock;

        // Create or update timer display
        if (!display) {
            const timerHtml = '<div id="otpTimer" style="margin: 10px 0; color: #d93025;"></div>';
            $mohideSelector.after(timerHtml);
        }

        const displayElement = document.querySelector("#otpTimer");

        const intervalId = setInterval(function() {
            const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
            const seconds = String(timer % 60).padStart(2, '0');

            if (displayElement) {
                displayElement.textContent = ' (' + minutes + ':' + seconds + ')';
            }

            if (timer <= 0) {
                clearInterval(intervalId);
                if (displayElement) {
                    displayElement.textContent = '';
                    $mo(displayElement).hide();
                }
                $mohideSelector.show();
            }

            timer--;
        }, 1000);
    }


    // Popup button selectors (for button-triggered popups)
    const popupButtonSelectors = [
        'input[id*="mo_wc_send_otp"]',
        'input[id*="miniorange_otp_token_submit"]',
        'input[id*="mo_send_otp_"]',
        'input[id*="mo_otp_token_submit"]',
        'input[id*="mo_tutor_lms_login_send_otp"]',
        'input[id*="mo_um_send_otp_pass"]',
        'input[id*="mo_um_accup_button"]',
        'input[id*="mo_tutor_lms_send_otp"]',
        'input[id*="mo_tutor_lms_student_send_otp"]',
        'input[id*="mo_um_getotp_button"]',
        'input[id*="send_otp"]',
        'a[id*="miniorange_otp_token_submit"]',
        'button[id*="miniorange_otp_token_submit"]',
        'button[id*="mo_send_otp_"]',
        'button[id*="miniorange_otp_token_submit_wc_block_checkout"]',
    ];

    /**
     * Initialize popup timer - called when popup is rendered
     * This script is loaded via mo_include_js action, so popup always exists
     */
    function init() {

        // Determine popup type
        const popupType = getPopupType();

        if (popupType === 'default') {
            // Handle default popup - check block status via AJAX
            handleDefaultPopup();
        } else if (popupType === 'error') {
            // Handle error popup - parse message for timer
            handleErrorPopup();
        }
    }

    // Run immediately - popup is guaranteed to exist when this script loads
    // because it's included via mo_include_js hook
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        init();
    }

    /**
     * Handle resend OTP click with cooldown check
     * Called from popup template when user clicks "Resend OTP"
     */
    function mo_otp_verification_resend() {
        var resendLink = document.querySelector("a[onclick*=\"mo_otp_verification_resend\"]");
        
        // Check cooldown flag before allowing resend
        if (window.mo_otp_timer_running || (resendLink && resendLink.dataset.cooldown === "true")) {
            return;
        }
        
        // Start timer before submitting
        mo_start_resend_timer();
        
        // Submit the form
        document.getElementById("verification_resend_otp_form").submit();
    }
    
    /**
     * Start resend cooldown timer
     * Prevents multiple rapid resend requests
     */
    function mo_start_resend_timer() {
        var resendLink = document.querySelector("a[onclick*=\"mo_otp_verification_resend\"]");
        
        if (!resendLink) {
            return;
        }
        
        // Check if timer is already running
        if (window.mo_otp_timer_running || resendLink.dataset.cooldown === "true") {
            return;
        }
        
        // Set cooldown flags
        window.mo_otp_timer_running = true;
        resendLink.dataset.cooldown = "true";
        
        // Find or create timer container
        var timerContainer = document.getElementById("mo_otp_resend_timer");
        
        if (!timerContainer) {
            // Clear flags on early exit
            window.mo_otp_timer_running = false;
            if (resendLink) {
                delete resendLink.dataset.cooldown;
            }
            return; // Exit early if no container
        }
        
        // Default cooldown time: 3 seconds
        var cooldownTime = 3;
        var remainingTime = cooldownTime;
        
        // Hide resend link and show timer
        if (resendLink) resendLink.style.display = "none";
        if (timerContainer) {
            timerContainer.style.display = "block";
            timerContainer.textContent = "Please wait " + remainingTime + " seconds...";
        }
        
        // Start countdown
        var timerInterval = setInterval(function() {
            remainingTime--;
            
            if (timerContainer) {
                timerContainer.textContent = "Please wait " + remainingTime + " seconds...";
            }
            
            if (remainingTime <= 0) {
                // Timer ended - clear everything
                if (timerContainer) timerContainer.style.display = "none";
                if (resendLink) resendLink.style.display = "block";
                clearInterval(timerInterval);
                window.mo_otp_timer_running = false; // Reset flag when timer ends
                if (resendLink) {
                    delete resendLink.dataset.cooldown;
                }
                return;
            }
        }, 1000);
    }

    // Make functions globally available for template inline calls
    window.mo_otp_verification_resend = mo_otp_verification_resend;
    window.mo_start_resend_timer = mo_start_resend_timer;

    // Make functions globally available for other scripts if needed
    window.MO_OSP_PopupTimer = {
        init: init,
        handleDefaultPopup: handleDefaultPopup,
        handleErrorPopup: handleErrorPopup,
        handleButtonTriggeredPopup: handleButtonTriggeredPopup,
        popUpButtonTimer: popUpButtonTimer,
        handlePuzzleVerification: handlePuzzleVerification,
        resendOTPAfterPuzzle: resendOTPAfterPuzzle,
        mo_otp_verification_resend: mo_otp_verification_resend,
        mo_start_resend_timer: mo_start_resend_timer
    };

})(jQuery);


