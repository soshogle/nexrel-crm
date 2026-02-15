/**
 * Fixed OTP Spam Preventer - Proper Integration with Existing OTP Flow
 * Based on resendcontrol addon patterns
 */

(function($mo) {
    'use strict';

    // Global variables
    let activeTimers = [];
    let isSpamPreventersInitialized = false;
    let currentBrowserID = '';

    // Button selectors (matching resendcontrol patterns)
    const buttonSelectors = [
        'input[value*="Send OTP"]',
        'input[value*="send otp"]', 
        'input[value*="SEND OTP"]',
        'button:contains("Send OTP")',
        'button:contains("send otp")',
        'button:contains("SEND OTP")',
        '#miniorange_otp_token_submit',
        'input[name="miniorange_otp_token_submit"]',
        'input[id*="send_otp"]',
        'input[class*="send_otp"]',
        'button[id*="send_otp"]',
        'button[class*="send_otp"]',
        '#mo_wc_send_otp'
    ];

    /**
     * Initialize spam preventer (following resendcontrol pattern)
     */
    function initializeSpamPreventer() {
        if (isSpamPreventersInitialized) {
            return;
        }
        
        // Initialize browser ID
        initializeBrowserID();
        
        // Wait for any OTP button to appear, then bind events
        waitForAnyElement(buttonSelectors, function(matchingSelector) {
            bindSpamPreventionEvents();
            
            // Check if we should auto-trigger Send OTP after puzzle verification
            checkAndAutoTriggerSendOTP();
        });

        isSpamPreventersInitialized = true;
    }
    
    /**
     * Show message after puzzle completion and prompt user to resubmit
     */
    function checkAndAutoTriggerSendOTP() {
        const puzzleCompleted = sessionStorage.getItem('mo_osp_puzzle_completed');
        
        if (puzzleCompleted === 'true') {
            
            // Clear the flag from sessionStorage
            sessionStorage.removeItem('mo_osp_puzzle_completed');
        }
    }

    /**
     * Initialize browser ID for tracking
     */
    function initializeBrowserID() {
        currentBrowserID = localStorage.getItem('mo_osp_browser_id');
        
        if (!currentBrowserID) {
            currentBrowserID = generateBrowserID();
            localStorage.setItem('mo_osp_browser_id', currentBrowserID);
        }
        
        // Make globally available
        window.mo_osp_browser_id = currentBrowserID;
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
     * Wait for any element to appear (resendcontrol pattern)
     */
    function waitForAnyElement(selectors, callback) {
        const interval = setInterval(() => {
            const matchingSelector = selectors.find(selector => $mo(selector).length > 0);
            if (matchingSelector) {
                clearInterval(interval);
                callback(matchingSelector);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
        }, 3000);
    }

    /**
     * Bind spam prevention events (following resendcontrol pattern)
     */
    function bindSpamPreventionEvents() {
        const messageSelector = 'div[id*="mo_message"]';
        
        buttonSelectors.forEach(function(buttonSelector) {
            $mo(buttonSelector).each(function() {
                const $mobutton = $mo(this);
                
                // Prevent multiple bindings
                if ($mobutton.data('spam-preventer-bound')) {
                    return;
                }
                $mobutton.data('spam-preventer-bound', true);
                
                $mobutton.on('click', function(e) {
                    
                    // CRITICAL: Skip spam prevention checks for external popup buttons
                    // External popup handles its own validation and error messages
                    // Check at click time since external popup may be dynamically loaded
                    const isExternalPopupButton = ($mobutton.attr('id') === 'send_otp' && 
                                                  $mo('#mo_site_otp_form').length > 0) ||
                                                 ($mo('#mo_site_otp_form').length > 0 && 
                                                  $mo('.mo_customer_validation-modal').length > 0 &&
                                                  ($mobutton.closest('#mo_site_otp_form').length > 0 || 
                                                   $mobutton.closest('.mo_customer_validation-modal').length > 0));
                    
                    if (isExternalPopupButton) {
                        // Don't prevent default or stop propagation - let external popup handle it
                        // Just return without doing anything
                        return;
                    }
                    
                    // Check if puzzle was just completed (skip puzzle check, allow OTP to proceed)
                    if (window.mo_osp_puzzle_just_completed || window.mo_osp_puzzle_verified) {
                        window.mo_osp_puzzle_just_completed = false; // Clear the flag
                        // Check cooldown even after puzzle completion
                        checkCooldownBeforeOTPSend($mobutton, messageSelector, e);
                        return;
                    }
                    
                    // IMPORTANT: Don't check puzzle requirement if we're currently verifying
                    // This prevents redundant AJAX calls during puzzle verification flow
                    if (window.MO_OSP_Puzzle && window.MO_OSP_Puzzle.isShowing) {
                        // Allow default behavior to continue
                        setupPostOTPHandling($mobutton, messageSelector);
                        return;
                    }
                    
                    // First check cooldown, then check puzzle requirement
                    checkCooldownBeforeOTPSend($mobutton, messageSelector, e).then(function(cooldownResult) {
                        if (cooldownResult.onCooldown) {
                            // Cooldown is active, show error message and prevent OTP send
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            showCooldownError($mobutton, messageSelector, cooldownResult.remainingTime);
                            return false;
                        } else {
                            // No cooldown, check if puzzle is required
                            checkPuzzleRequirement().then(function(result) {
                                if (result.puzzleRequired) {
                                    e.preventDefault();
                                    e.stopImmediatePropagation();
                                    showPuzzlePopup();
                                    return false;
                                } else {
                                    setupPostOTPHandling($mobutton, messageSelector);
                                }
                            }).catch(function(error) {
                                setupPostOTPHandling($mobutton, messageSelector);
                            });
                        }
                    }).catch(function(error) {
                        // On error, proceed with normal flow
                        checkPuzzleRequirement().then(function(result) {
                            if (result.puzzleRequired) {
                                e.preventDefault();
                                e.stopImmediatePropagation();
                                showPuzzlePopup();
                                return false;
                            } else {
                                setupPostOTPHandling($mobutton, messageSelector);
                            }
                        }).catch(function(error2) {
                            setupPostOTPHandling($mobutton, messageSelector);
                        });
                    });
                });
            });
        });
    }

    /**
     * Check if cooldown is active before OTP send
     */
    function checkCooldownBeforeOTPSend($mobutton, messageSelector, e) {
        return new Promise((resolve, reject) => {
            if (typeof mo_osp_ajax === 'undefined') {
                resolve({ onCooldown: false });
                return;
            }

            const email = getEmailFromForm();
            const phone = getPhoneFromForm();

            $mo.ajax({
                url: mo_osp_ajax.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'mo_osp_check_blocked',
                    nonce: mo_osp_ajax.nonce,
                    mo_osp_browser_id: currentBrowserID,
                    email: email,
                    phone: phone
                },
                success: function(response) {
                    // Handle WordPress JSON success wrapper
                    if (response && response.data) {
                        response = response.data;
                    }
                    
                    if (response && response.cooldown && response.remaining_time > 0) {
                        resolve({ 
                            onCooldown: true, 
                            remainingTime: parseInt(response.remaining_time) 
                        });
                    } else {
                        resolve({ onCooldown: false });
                    }
                },
                error: function(xhr, status, error) {
                    // If response is HTML (error page), treat as no cooldown to allow OTP send
                    if (xhr.responseText && xhr.responseText.trim().startsWith('<')) {
                        resolve({ onCooldown: false });
                        return;
                    }
                    resolve({ onCooldown: false });
                }
            });
        });
    }

    /**
     * Show cooldown error message with timer
     */
    function showCooldownError($mobutton, messageSelector, remainingTime) {
        
        // Find or create message element
        let $momessageElem = $mo(messageSelector);
        if ($momessageElem.length === 0) {
            $momessageElem = $mo('div[id*="mo_message"], #mo_message, .mo_message').first();
        }
        
        // If still no message element, try to find the form and create one
        if ($momessageElem.length === 0) {
            const $form = $mobutton.closest('form');
            if ($form.length > 0) {
                // Try to find existing message container or create one
                $momessageElem = $form.find('[id*="mo_message"], .mo_message').first();
                if ($momessageElem.length === 0) {
                    // Create message element
                    $momessageElem = $mo('<div id="mo_message" style="display:block;"></div>');
                    $mobutton.before($momessageElem);
                }
            }
        }
        
        if ($momessageElem.length === 0) {
            // Last resort: create a message element at the button's location
            $momessageElem = $mo('<div id="mo_message" style="display:block;margin:10px 0;"></div>');
            $mobutton.before($momessageElem);
        }
        
        
        // Format the error message with timer using USER_IS_BLOCKED_AJAX format
        // Message: "You have exceeded the limit to send OTP. Please wait for {minutes}:{seconds} minutes"
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        // Use the USER_IS_BLOCKED_AJAX message format
        const errorMessage = 'You have exceeded the limit to send OTP. Please wait for ' + 
                            formattedMinutes + ':' + formattedSeconds + ' minutes';
        
        
        // Display the error message
        $momessageElem.text(errorMessage);
        $momessageElem.css({
            'background-color': '#ffefef',
            'color': '#ff5b5b',
            'padding': '10px',
            'border-radius': '4px',
            'margin': '10px 0'
        });
        $momessageElem.show();
        
        // Start the timer (use isBlocked=true for error messages)
        startBlockTimer(remainingTime, $mobutton, $momessageElem, errorMessage);
    }

    /**
     * Show puzzle popup for AJAX forms when puzzle_required response is received
     */
    function showPuzzleForAjaxForm(response) {
        
        // Check if puzzle popup HTML exists (should be added by mosp_add_puzzle_popup_to_frontend)
        if ($mo('#mo-osp-puzzle-overlay').length === 0) {
            console.error('[OSP] Puzzle overlay not found! Make sure puzzle popup HTML is added to frontend.');
            // Show error message to user
            const messageElement = findMessageElement();
            if (messageElement && messageElement.length > 0) {
                $mo(messageElement).text('Puzzle verification required but puzzle system is not loaded. Please refresh the page.').css({
                    'background-color': '#ffefef',
                    'color': '#ff5b5b'
                }).show();
            }
            return;
        }
        
        // CRITICAL: Ensure puzzle overlay has higher z-index than WooCommerce checkout popup
        // WooCommerce checkout popup uses z-index: 100000, so puzzle needs to be higher
        var $puzzleOverlay = $mo('#mo-osp-puzzle-overlay');
        $puzzleOverlay.css('z-index', '100001');
        
        // Show the puzzle popup
        $mo('#mo-osp-puzzle-popup-outer-div').show().css('z-index', '100002');
        $puzzleOverlay.removeClass('mo-osp-hidden');
        
        // Set up callback for when puzzle is completed
        window.MO_OSP_Puzzle_onAjaxSuccess = function(verificationData) {
            
            // PRIORITY 1: Try to resubmit stored AJAX request if available
            if (window.mo_osp_pending_ajax_request) {
                const originalRequest = window.mo_osp_pending_ajax_request;
                
                // Add puzzle verification data to the request
                let requestData = originalRequest.data;
                
                // Handle both string and object data formats
                if (typeof requestData === 'string') {
                    // Parse query string and add puzzle data
                    const params = new URLSearchParams(requestData);
                    params.set('puzzle_verified', 'true');
                    if (verificationData && verificationData.puzzle_nonce) {
                        params.set('mo_osp_puzzle_nonce', verificationData.puzzle_nonce);
                    }
                    if (verificationData && verificationData.verification_token) {
                        params.set('verification_token', verificationData.verification_token);
                    }
                    requestData = params.toString();
                } else if (typeof requestData === 'object') {
                    // Add puzzle data to object
                    requestData.puzzle_verified = 'true';
                    if (verificationData && verificationData.puzzle_nonce) {
                        requestData.mo_osp_puzzle_nonce = verificationData.puzzle_nonce;
                    }
                    if (verificationData && verificationData.verification_token) {
                        requestData.verification_token = verificationData.verification_token;
                    }
                }
                
                
                // Resubmit the original AJAX request with puzzle verification data
                $mo.ajax({
                    url: originalRequest.url,
                    type: originalRequest.type,
                    data: requestData,
                    dataType: originalRequest.dataType,
                    crossDomain: originalRequest.crossDomain,
                    success: function(response) {
                        // Call original success callback if it exists
                        if (originalRequest.originalSuccess) {
                            originalRequest.originalSuccess.call(this, response);
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error('[OSP] Resubmitted AJAX request failed:', textStatus, errorThrown);
                        // Call original error callback if it exists
                        if (originalRequest.originalError) {
                            originalRequest.originalError.call(this, jqXHR, textStatus, errorThrown);
                        }
                    }
                });
                
                // Clear stored request
                delete window.mo_osp_pending_ajax_request;
                return;
            }
            
            // PRIORITY 2: Fallback to button click if no stored request
            const $button = $mo(buttonSelectors.join(',')).filter(':visible').first();
            if ($button.length > 0) {
                // Trigger the button click again to resubmit OTP request
                // The puzzle_verified flag will be added by puzzle-system.js
                $button.trigger('click');
            } else {
                console.error('[OSP] Could not find OTP button to resubmit request');
                console.error('[OSP] Available buttons:', $mo(buttonSelectors.join(',')).length);
                console.error('[OSP] Button selectors:', buttonSelectors);
                
                // Last resort: Try to find any form and submit it
                const $forms = $mo('form').not('#mo_validate_form').not('#validation_goBack_form').not('#verification_resend_otp_form');
                if ($forms.length > 0) {
                    const $form = $forms.first();
                    
                    // Add puzzle verification data
                    if (!$form.find('input[name="puzzle_verified"]').length) {
                        $form.append('<input type="hidden" name="puzzle_verified" value="true">');
                    }
                    if (verificationData && verificationData.puzzle_nonce && !$form.find('input[name="mo_osp_puzzle_nonce"]').length) {
                        $form.append('<input type="hidden" name="mo_osp_puzzle_nonce" value="' + verificationData.puzzle_nonce + '">');
                    }
                    if (verificationData && verificationData.verification_token && !$form.find('input[name="verification_token"]').length) {
                        $form.append('<input type="hidden" name="verification_token" value="' + verificationData.verification_token + '">');
                    }
                    
                    $form.submit();
                } else {
                    console.error('[OSP] No form found either. User may need to manually resubmit.');
                }
            }
        };
        
        // Initialize and show puzzle if system is available
        if (typeof window.MO_OSP_Puzzle !== 'undefined') {
            if (typeof window.MO_OSP_Puzzle.init === 'function' && !window.MO_OSP_Puzzle.initialized) {
                window.MO_OSP_Puzzle.init();
                window.MO_OSP_Puzzle.initialized = true;
            }
            window.MO_OSP_Puzzle.showPuzzle({});
        } else {
            console.error('[OSP] MO_OSP_Puzzle not available yet, waiting...');
            // Wait for puzzle system to load
            setTimeout(function() {
                if (typeof window.MO_OSP_Puzzle !== 'undefined') {
                    if (typeof window.MO_OSP_Puzzle.init === 'function' && !window.MO_OSP_Puzzle.initialized) {
                        window.MO_OSP_Puzzle.init();
                        window.MO_OSP_Puzzle.initialized = true;
                    }
                    window.MO_OSP_Puzzle.showPuzzle({});
                } else {
                    console.error('[OSP] MO_OSP_Puzzle still not available after wait');
                    const messageElement = findMessageElement();
                    if (messageElement && messageElement.length > 0) {
                        $mo(messageElement).text('Puzzle verification required but puzzle system failed to load. Please refresh the page.').css({
                            'background-color': '#ffefef',
                            'color': '#ff5b5b'
                        }).show();
                    }
                }
            }, 500);
        }
    }

    /**
     * Check if puzzle is required before OTP send
     */
    function checkPuzzleRequirement() {
        return new Promise((resolve, reject) => {
            if (typeof mo_osp_ajax === 'undefined') {
                resolve({ puzzleRequired: false });
                return;
            }

            $mo.ajax({
                url: mo_osp_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mo_osp_check_puzzle_requirement',
                    nonce: mo_osp_ajax.nonce,
                    mo_osp_browser_id: currentBrowserID,
                    email: getEmailFromForm(),
                    phone: getPhoneFromForm()
                },
                success: function(response) {
                    if (response.success && response.data) {
                        const puzzleRequired = response.data.puzzle_required === true;
                        resolve({ puzzleRequired: puzzleRequired });
                    } else {
                        resolve({ puzzleRequired: false });
                    }
                },
                error: function() {
                    reject(new Error('Failed to check puzzle requirement'));
                }
            });
        });
    }

    /**
     * Setup post-OTP handling - intercept AJAX responses and add timers
     */
    function setupPostOTPHandling($mobutton, messageSelector) {
        // Hide button immediately to prevent double clicks
        $mobutton.hide();
        
        // Store button reference for later use
        $mobutton.data('mo-osp-waiting-for-response', true);
    }

    /**
     * Intercept AJAX responses to add timers to messages
     * This is called globally for all AJAX responses
     */
    function interceptAjaxResponse(response, messageElement) {
        
        if (!response) {
            return;
        }

        // PRIORITY 0: Handle puzzle_required response for AJAX forms
        if (response.result === 'puzzle_required' || response.puzzle_required === true || response.authType === 'PUZZLE_REQUIRED') {
            showPuzzleForAjaxForm(response);
            return;
        }

        if (!response.message) {
            return;
        }

        const messageText = response.message;
        const isSuccess = response.result === 'success' || response.result === 'SUCCESS';
        const isError = response.result === 'error' || response.result === 'ERROR';
        
        // Find message element if not provided
        if (!messageElement) {
            messageElement = findMessageElement();
        }
        
        if (!messageElement || messageElement.length === 0) {
            // Try again after a short delay
            setTimeout(function() {
                interceptAjaxResponse(response, null);
            }, 200);
            return;
        }
        
        
        // PRIORITY 1: Handle error/blocked responses with timer (cooldown/block)
        // This should override any existing success messages
        // Check for error response OR error message in text
        const isBlockedError = (isError && response.blocked === true && response.remaining_time > 0) ||
                               (messageText.includes('exceeded') && messageText.includes('limit') && messageText.match(/\d+:\d+/));
        
        if (isBlockedError) {
            const $messageElement = $mo(messageElement);
            
            // Extract remaining time from response or message text
            let remainingTime = 0;
            if (response.remaining_time && response.remaining_time > 0) {
                remainingTime = response.remaining_time;
            } else {
                // Try to extract from message text
                remainingTime = extractTimerFromMessage(messageText);
            }
            
            if (remainingTime <= 0) {
                return;
            }
            
            // Stop any existing timers for this element
            if ($messageElement.data('mo-osp-timer-active')) {
                // Clear all active timers
                activeTimers.forEach(function(timer) {
                    clearInterval(timer);
                });
                activeTimers = [];
            }
            
            // Clear any existing timer flags to allow replacement
            $messageElement.data('mo-osp-timer-added', false);
            $messageElement.data('mo-osp-timer-active', false);
            
            // Format the error message with timer
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');
            
            // Use the message from response, or format it if it has placeholders
            let errorMessage = messageText;
            if (errorMessage.includes('{minutes}') || errorMessage.includes('{seconds}')) {
                errorMessage = errorMessage.replace('{minutes}', formattedMinutes).replace('{seconds}', formattedSeconds);
            } else if (!errorMessage.includes(formattedMinutes + ':' + formattedSeconds)) {
                // If message doesn't have timer format, format it
                if (errorMessage.includes('exceeded') && errorMessage.includes('limit')) {
                    // Extract the base message (before the timer)
                    const baseMessage = errorMessage.replace(/\d+:\d+\s*(?:minute|min)s?/i, '').trim();
                    if (baseMessage.endsWith('Please wait for')) {
                        errorMessage = baseMessage.substring(0, baseMessage.lastIndexOf('Please wait for')).trim() + ' Please wait for ' + formattedMinutes + ':' + formattedSeconds + ' minutes';
                    } else {
                        errorMessage = errorMessage.replace(/\d+:\d+\s*(?:minute|min)s?/i, formattedMinutes + ':' + formattedSeconds + ' minutes');
                    }
                } else {
                    errorMessage = messageText;
                }
            }
            
            // Replace the message content with error message (overwrite any success message)
            $messageElement.text(errorMessage);
            $messageElement.css({
                'background-color': '#ffefef',
                'color': '#ff5b5b'
            });
            $messageElement.show();
            
            // Set a flag to prevent success message from overwriting this error
            $messageElement.data('mo-osp-error-message', true);
            
            // Store error response for potential restoration if overwritten
            window.mo_osp_last_error_response = {
                blocked: true,
                message: errorMessage,
                remaining_time: remainingTime,
                result: 'error'
            };
            
            // Start the timer (this will check for active timer, but we've cleared it)
            const $button = findButtonForMessage(messageElement);
            startBlockTimer(remainingTime, $button, messageElement, errorMessage);
            return;
        }
        
        // PRIORITY 2: Check if it's a blocked/error message with timer in text
        if ((isError || messageText.includes('exceeded')) && messageText.includes('limit')) {
            const totalSeconds = extractTimerFromMessage(messageText);
            if (totalSeconds > 0) {
                const $messageElement = $mo(messageElement);
                // Clear any existing timer flags
                $messageElement.data('mo-osp-timer-added', false);
                $messageElement.data('mo-osp-timer-active', false);
                // Update message styling for error
                $messageElement.css({
                    'background-color': '#ffefef',
                    'color': '#ff5b5b'
                });
                const $button = findButtonForMessage(messageElement);
                startBlockTimer(totalSeconds, $button, messageElement, messageText);
                return;
            }
        }
        
        // Check if it's a success message (OTP sent)
        // But don't process if we have an active error message
        const $messageElement = $mo(messageElement);
        if (isSuccess && (messageText.includes('sent') || messageText.includes('OTP') || messageText.includes('passcode'))) {
            // Check if we have an active error message - if so, don't overwrite it
            if ($messageElement.data('mo-osp-error-message')) {
                return;
            }
            
            // CRITICAL: Skip cooldown check for external popup responses
            // External popup handles its own success/error messages and shouldn't be overwritten
            const isExternalPopup = ($messageElement.attr('id') === 'mo_message' && 
                                    $mo('#mo_site_otp_form').length > 0) ||
                                   ($mo('#mo_site_otp_form').length > 0 && 
                                    $mo('.mo_customer_validation-modal').length > 0);
            
            if (isExternalPopup) {
                return; // Don't process external popup success messages - let external popup handle them
            }
            
            // Get actual remaining cooldown time from backend
            const email = getEmailFromForm();
            const phone = getPhoneFromForm();
            
            if (typeof mo_osp_ajax !== 'undefined') {
                $mo.ajax({
                    url: mo_osp_ajax.ajax_url,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'mo_osp_check_blocked',
                        nonce: mo_osp_ajax.nonce,
                        mo_osp_browser_id: currentBrowserID,
                        email: email,
                        phone: phone
                    },
                    success: function(cooldownResponse) {
                        // Handle WordPress JSON success wrapper
                        if (cooldownResponse && cooldownResponse.data) {
                            cooldownResponse = cooldownResponse.data;
                        }
                        
                        let cooldownTime = 0;
                        
                        // Check if user is on cooldown
                        if (cooldownResponse && cooldownResponse.cooldown && cooldownResponse.remaining_time > 0) {
                            cooldownTime = parseInt(cooldownResponse.remaining_time);
                        } else {
                            // If not on cooldown yet, use default cooldown time
                            cooldownTime = (typeof mo_osp_ajax !== 'undefined' && mo_osp_ajax.timer_time) 
                                ? parseInt(mo_osp_ajax.timer_time) : 60;
                        }
                        
                        if (cooldownTime > 0) {
                            const $button = findButtonForMessage(messageElement);
                            startCooldownTimer(cooldownTime, $button, messageElement, messageText);
                        } else {
                            // No cooldown (likely whitelisted IP), show success message without timer
                            const $button = findButtonForMessage(messageElement);
                            if ($button && $button.length > 0) {
                                $button.show();
                            }
                            // Update message to show success without timer text
                            if (messageElement && window.verifyOTPmessage) {
                                const $message = $mo(messageElement);
                                $message.text(window.verifyOTPmessage);
                            }
                        }
                    },
                    error: function(xhr, status, error) {
                        // If response is HTML (error page), treat as no cooldown to allow OTP send
                        if (xhr.responseText && xhr.responseText.trim().startsWith('<')) {
                            // HTML response - likely an error page, skip timer
                            const $button = findButtonForMessage(messageElement);
                            if ($button && $button.length > 0) {
                                $button.show();
                            }
                            return;
                        }
                        // Fallback to default cooldown time on error
                        const defaultTime = (typeof mo_osp_ajax !== 'undefined' && mo_osp_ajax.timer_time) 
                            ? parseInt(mo_osp_ajax.timer_time) : 60;
                        const $button = findButtonForMessage(messageElement);
                        startCooldownTimer(defaultTime, $button, messageElement, messageText);
                    }
                });
            } else {
                // Fallback if mo_osp_ajax is not available
                const defaultTime = 60;
                const $button = findButtonForMessage(messageElement);
                startCooldownTimer(defaultTime, $button, messageElement, messageText);
            }
        }
    }

    /**
     * Find message element using various selectors
     */
    function findMessageElement() {
        const selectors = [
            'div[id*="mo_message"]',
            '#mo_message',
            '.mo_message',
            '[id*="mo_message"]',
            '[class*="mo_message"]'
        ];
        
        for (let i = 0; i < selectors.length; i++) {
            const $elem = $mo(selectors[i]);
            if ($elem.length > 0 && $elem.is(':visible')) {
                return $elem.first();
            }
        }
        
        return null;
    }

    /**
     * Find button associated with message element
     */
    function findButtonForMessage($messageElement) {
        if (!$messageElement || $messageElement.length === 0) {
            return $mo();
        }
        
        // Try to find button near the message element
        const $form = $messageElement.closest('form');
        if ($form.length > 0) {
            for (let i = 0; i < buttonSelectors.length; i++) {
                const $button = $form.find(buttonSelectors[i]);
                if ($button.length > 0) {
                    return $button.first();
                }
            }
        }
        
        // Fallback: find any button with waiting flag
        return $mo(buttonSelectors.join(', ')).filter(function() {
            return $mo(this).data('mo-osp-waiting-for-response') === true;
        }).first();
    }

    /**
     * Extract timer from message text
     */
    function extractTimerFromMessage(messageText) {
        let totalSeconds = 0;
        
        // Pattern 1: MM:SS format (handle large numbers like 1430:57)
        const timerMatch = messageText.match(/(\d{1,4}):(\d{2})/);
        if (timerMatch) {
            const minutes = parseInt(timerMatch[1]);
            const seconds = parseInt(timerMatch[2]);
            totalSeconds = (minutes * 60) + seconds;
            return totalSeconds;
        }
        
        // Pattern 2: "X minutes" format
        const altTimerMatch = messageText.match(/(\d+)\s*minutes?/i);
        if (altTimerMatch) {
            totalSeconds = parseInt(altTimerMatch[1]) * 60;
            return totalSeconds;
        }
        
        // Pattern 3: "X seconds" format
        const secTimerMatch = messageText.match(/(\d+)\s*seconds?/i);
        if (secTimerMatch) {
            totalSeconds = parseInt(secTimerMatch[1]);
            return totalSeconds;
        }
        
        return 0;
    }

    /**
     * Start cooldown timer (resendcontrol pattern)
     */
    function startCooldownTimer(timeLeft, $mobutton, $momessageElem, message) {
        
        if ($momessageElem.length > 0) {
            $momessageElem.show();
            
            // CRITICAL: Preserve success message styling (green background, dark text)
            // Check if this is a success message by looking at background color
            const bgColor = $momessageElem.css('background-color');
            const isSuccessMessage = bgColor && (
                bgColor === 'rgb(142, 237, 142)' || 
                bgColor === '#8eed8e' ||
                bgColor.indexOf('142, 237, 142') !== -1 ||
                $momessageElem.css('background-color').indexOf('8eed8e') !== -1
            );
            
            if (isSuccessMessage) {
                // Ensure success styling is preserved (green background, dark text for readability)
                $momessageElem.css({
                    'color': '#464646', // Dark green text for better readability on green background
                    'background-color': '#8eed8e', // Green background
                });
            }
        }
        
        startTimer(timeLeft, $momessageElem[0], $mobutton, message, false);
    }

    /**
     * Start block timer (resendcontrol pattern)
     */
    function startBlockTimer(timeLeft, $mobutton, $momessageElem, message) {
        
        if ($momessageElem.length > 0) {
            $momessageElem.show();
        }
        
        startTimer(timeLeft, $momessageElem[0], $mobutton, message, true);
    }

    /**
     * Generic timer function (optimized)
     */
    function startTimer(duration, display, button, displayMessage, isBlocked) {
        if (!display) {
            return;
        }
        
        // If duration is 0 or less, don't start timer (for whitelisted IPs or when no cooldown).
        if (duration <= 0) {
            const $display = $mo(display);
            // Just show the message without timer
            if (displayMessage && window.verifyOTPmessage) {
                $display.text(window.verifyOTPmessage);
            } else if (displayMessage) {
                $display.text(displayMessage);
            }
            return;
        }
        
        const $display = $mo(display);
        
        // Check if timer is already active - prevent duplicate timers
        if ($display.data('mo-osp-timer-active')) {
            return;
        }
        
        // Mark as having timer to prevent duplicates
        $display.data('mo-osp-timer-active', true);
        
        let timer = duration;
        
        // Update immediately
        const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
        const seconds = String(timer % 60).padStart(2, '0');
        const formattedMessage = formatTimerMessage(displayMessage, minutes, seconds, timer, isBlocked);
        $display.text(formattedMessage);
        
        // CRITICAL: Set success styling AFTER text update to override any inline styles
        if (!isBlocked) {
            const bgColor = $display.css('background-color');
            const isSuccessMessage = bgColor && (
                bgColor === 'rgb(142, 237, 142)' || 
                bgColor === '#8eed8e' ||
                bgColor.indexOf('142, 237, 142') !== -1
            );
            
            if (isSuccessMessage) {
                // Override inline styles to ensure correct success styling
                $display.css({
                    'color': '#464646', // Dark green text for better readability on green background
                    'background-color': '#8eed8e', // Green background
                });
            }
        }
        
        $display.show();

        const timerFunction = setInterval(() => {
            // Check if error message flag is set - if so, this timer should stop (error message takes priority)
            if ($display.data('mo-osp-error-message') && !isBlocked) {
                clearInterval(timerFunction);
                const index = activeTimers.indexOf(timerFunction);
                if (index > -1) {
                    activeTimers.splice(index, 1);
                }
                return;
            }
            
            timer--;
            
            if (timer < 0) {
                clearInterval(timerFunction);
                
                // Remove timer flag
                $display.data('mo-osp-timer-active', false);
                $display.data('mo-osp-timer-added', false);
                $display.data('mo-osp-error-message', false);
                
                // Hide message and show button
                $display.hide();
                if (button && button.length > 0) {
                    $mo(button).show();
                    $mo(button).data('mo-osp-waiting-for-response', false);
                }
                
                // Remove from active timers
                const index = activeTimers.indexOf(timerFunction);
                if (index > -1) {
                    activeTimers.splice(index, 1);
                }
                return;
            }

            const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
            const seconds = String(timer % 60).padStart(2, '0');
            const formattedMessage = formatTimerMessage(displayMessage, minutes, seconds, timer, isBlocked);
            
            // CRITICAL: Preserve success message styling when updating text
            // Check if this is a success message (not blocked) and has green background
            if (!isBlocked) {
                const bgColor = $display.css('background-color');
                const isSuccessMessage = bgColor && (
                    bgColor === 'rgb(142, 237, 142)' || 
                    bgColor === '#8eed8e' ||
                    bgColor.indexOf('142, 237, 142') !== -1
                );
                
                if (isSuccessMessage) {
                    // Preserve success styling when updating text
                    $display.css({
                        'color': '#464646', // Dark green text for readability
                        'background-color': '#8eed8e', // Green background
                    });
                }
            }
            
            // Always update the message text
            // For error messages (isBlocked=true), we need to update the countdown
            // For success messages, we also need to update the countdown
            $display.text(formattedMessage);
            
            // CRITICAL: Set success styling AFTER text update to override any inline styles
            if (!isBlocked) {
                const bgColor = $display.css('background-color');
                const isSuccessMessage = bgColor && (
                    bgColor === 'rgb(142, 237, 142)' || 
                    bgColor === '#8eed8e' ||
                    bgColor.indexOf('142, 237, 142') !== -1
                );
                
                if (isSuccessMessage) {
                    // Override inline styles to ensure correct success styling
                    $display.css({
                        'color': '#464646', // Dark green text for readability
                        'background-color': '#8eed8e', // Green background
                    });
                }
            }
        }, 1000);

        activeTimers.push(timerFunction);
    }

    /**
     * Format timer message with countdown (consolidated logic)
     */
    function formatTimerMessage(displayMessage, minutes, seconds, totalSeconds, isBlocked) {
        const serverMessage = displayMessage || (isBlocked ? 'You are temporarily blocked.' : 'Please wait before requesting another OTP.');
        
        // Check if message has placeholder patterns
        if (serverMessage.includes('{minutes}') && serverMessage.includes('{seconds}')) {
            return serverMessage.replace('{minutes}', minutes).replace('{seconds}', seconds);
        }
        
        // Check if message already contains timer information (avoid duplication)
        if (serverMessage.match(/\d{1,4}:\d{2}\s*(minutes?|mins?)/i)) {
            return serverMessage.replace(/\d{1,4}:\d{2}\s*(minutes?|mins?)/gi, `${minutes}:${seconds} minutes`);
        }
        
        if (serverMessage.match(/\d+\s*(minutes?|mins?)/i)) {
            const totalMinutes = Math.floor(totalSeconds / 60);
            return serverMessage.replace(/\d+\s*(minutes?|mins?)/gi, `${totalMinutes} minutes`);
        }
        
        if (serverMessage.match(/\d+\s*(seconds?|secs?)/i)) {
            return serverMessage.replace(/\d+\s*(seconds?|secs?)/gi, `${totalSeconds} seconds`);
        }
        
        // If totalSeconds is 0, don't add timer text (for whitelisted IPs or when no cooldown).
        if (totalSeconds <= 0) {
            if (!isBlocked && window.verifyOTPmessage) {
                return window.verifyOTPmessage;
            }
            return serverMessage;
        }
        
        // For cooldown messages, try to use window.verifyOTPmessage if available and no server message
        if (!isBlocked && (!displayMessage || displayMessage.trim() === '') && window.verifyOTPmessage) {
            return window.verifyOTPmessage + ` You can send the next OTP after ${minutes}:${seconds}.`;
        }
        
        // Fallback: add countdown to server message
        // For success messages, use a more descriptive text
        if (!isBlocked) {
            return `${serverMessage} You can send the next OTP after ${minutes}:${seconds}.`;
        }
        return `${serverMessage} (${minutes}:${seconds} remaining)`;
    }

    /**
     * Show puzzle popup
     */
    function showPuzzlePopup() {
        if (typeof MO_OSP_Puzzle !== 'undefined') {
            // CRITICAL: Ensure puzzle overlay has higher z-index than WooCommerce checkout popup
            // WooCommerce checkout popup uses z-index: 100000, so puzzle needs to be higher
            var $puzzleOverlay = $mo('#mo-osp-puzzle-overlay');
            if ($puzzleOverlay.length > 0) {
                $puzzleOverlay.css('z-index', '100001');
            }
            var $puzzlePopup = $mo('#mo-osp-puzzle-popup-outer-div');
            if ($puzzlePopup.length > 0) {
                $puzzlePopup.css('z-index', '100002');
            }
            MO_OSP_Puzzle.showPuzzle({});
        } else {
            alert('Security verification required. Please refresh the page.');
        }
    }

    /**
     * Clear all active timers
     */
    function clearAllTimers() {
        activeTimers.forEach(function(timer) {
            clearInterval(timer);
        });
        activeTimers = [];
    }

    /**
     * Get email from form fields (with phone fallback for consistency)
     */
    function getEmailFromForm() {
        let email = '';
        $mo('input[type="email"], input[name*="email"], input[id*="email"]').each(function() {
            const $field = $mo(this);
            const type = ($field.attr('type') || '').toLowerCase();
            if (type === 'button' || type === 'submit' || type === 'reset') {
                return;
            }
            const value = $field.val();
            if (value && !/send\s+otp|verify\s+otp/i.test(value)) {
                email = value;
                return false;
            }
        });
        
        // If no email found, use phone number as email for consistency
        if (!email) {
            const phone = getPhoneFromForm();
            if (phone) {
                email = phone;
            }
        }
        return email;
    }

    /**
     * Get phone from form fields
     */
    function getPhoneFromForm() {
        let phone = '';
        $mo('input[type="tel"], input[name*="phone"], input[id*="phone"], input[name*="mobile"]').each(function() {
            const $field = $mo(this);
            const type = ($field.attr('type') || '').toLowerCase();
            if (type === 'button' || type === 'submit' || type === 'reset') {
                return;
            }
            const value = $field.val();
            if (!value || /send\s+otp|verify\s+otp/i.test(value)) {
                return;
            }
            // Normalize to digits/+ and require a minimum length to avoid tokens like "6ff2c895dc".
            const normalized = String(value).replace(/[^0-9+]/g, '');
            const digitCount = normalized.replace(/\D/g, '').length;
            if (digitCount >= 6) {
                phone = normalized;
                return false;
            }
        });
        return phone;
    }

    /**
     * Handle puzzle success (called by puzzle system)
     */
    window.MO_OSP_SpamPreventer_onPuzzleSuccess = function() {
        clearAllTimers();
        
        // Set flag to allow OTP to proceed after puzzle completion
        window.mo_osp_skip_puzzle_check = true;
        setTimeout(function() {
            window.mo_osp_skip_puzzle_check = false;
        }, 5000);
        
        // Clear any existing verifyOTPmessage
        if (window.verifyOTPmessage) {
            delete window.verifyOTPmessage;
        }
        
        // Hide any existing messages
        $mo('div[id*="mo_message"]').hide();
        
        // Show all OTP buttons
        buttonSelectors.forEach(function(selector) {
            $mo(selector).show();
        });
    };

    /**
     * Setup global AJAX response interceptor and message monitor
     */
    function setupAjaxInterceptor() {
        // Monitor for message elements that are added or updated
        const messageObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Check added nodes
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        checkAndAddTimerToMessage($mo(node));
                    }
                });
                
                // Check for text changes in existing message elements
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const target = mutation.target;
                    if (target.nodeType === 1) {
                        const $target = $mo(target);
                        if ($target.is('[id*="mo_message"], .mo_message, [class*="mo_message"]') || 
                            $target.find('[id*="mo_message"], .mo_message').length > 0) {
                            // Use immediate check (no setTimeout) to catch error messages before they're overwritten
                            const $msgElem = $target.is('[id*="mo_message"], .mo_message') ? $target : $target.find('[id*="mo_message"], .mo_message').first();
                            if ($msgElem.length > 0) {
                                const currentText = $msgElem.text() || '';
                                
                                // PRIORITY: Check if error message just appeared
                                // But only process if we haven't already processed this exact message
                                if (currentText.includes('exceeded') && currentText.includes('limit')) {
                                    const lastProcessedError = $msgElem.data('mo-osp-last-processed-error');
                                    const timerActive = $msgElem.data('mo-osp-timer-active');
                                    if (lastProcessedError !== currentText || !timerActive) {
                                        checkAndAddTimerToMessage($msgElem);
                                        return;
                                    } else {
                                        // Already processed this error message and timer is active, skip to prevent loop
                                        return;
                                    }
                                }
                                
                                // Check if error message flag is set but message was overwritten with success
                                if ($msgElem.data('mo-osp-error-message')) {
                                    // If error flag is set but message is success, restore error message
                                    if (currentText.includes('sent') && currentText.includes('OTP') && !currentText.includes('exceeded')) {
                                        // The error should have been set by interceptAjaxResponse, but if it was overwritten,
                                        // we need to check if we have the error response stored
                                        if (window.mo_osp_last_error_response && window.mo_osp_last_error_response.blocked) {
                                            const errorResponse = window.mo_osp_last_error_response;
                                            const minutes = Math.floor(errorResponse.remaining_time / 60);
                                            const seconds = errorResponse.remaining_time % 60;
                                            const formattedMinutes = String(minutes).padStart(2, '0');
                                            const formattedSeconds = String(seconds).padStart(2, '0');
                                            let errorMessage = errorResponse.message || 'You have exceeded the limit to send OTP. Please wait for ' + 
                                                formattedMinutes + ':' + formattedSeconds + ' minutes';
                                            if (errorMessage.includes('{minutes}') || errorMessage.includes('{seconds}')) {
                                                errorMessage = errorMessage.replace('{minutes}', formattedMinutes).replace('{seconds}', formattedSeconds);
                                            }
                                            $msgElem.text(errorMessage);
                                            $msgElem.css({
                                                'background-color': '#ffefef',
                                                'color': '#ff5b5b'
                                            });
                                            // Clear timer flags and restart timer
                                            $msgElem.data('mo-osp-timer-active', false);
                                            $msgElem.data('mo-osp-timer-added', false);
                                            const $button = findButtonForMessage($msgElem);
                                            startBlockTimer(errorResponse.remaining_time, $button, $msgElem, errorMessage);
                                            return;
                                        }
                                    }
                                }
                                
                                // For other messages, use setTimeout to avoid too many checks
                                setTimeout(function() {
                                    checkAndAddTimerToMessage($msgElem);
                                }, 100);
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the document body for changes
        if (document.body) {
            messageObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        
        // Also check existing messages periodically (fallback)
        setInterval(function() {
            const $messages = $mo('[id*="mo_message"], .mo_message');
            $messages.each(function() {
                const $msg = $mo(this);
                if ($msg.is(':visible') && !$msg.data('mo-osp-timer-added')) {
                    checkAndAddTimerToMessage($msg);
                }
            });
        }, 500);
        
        // Intercept jQuery AJAX responses and store request data for puzzle resubmission
        const originalAjax = $mo.ajax;
        $mo.ajax = function(options) {
            const originalSuccess = options.success;
            const originalError = options.error;
            
            // Check if this is an OTP-related request by examining URL or data
            const isOtpRequest = (options.url && (
                options.url.indexOf('admin-ajax.php') !== -1 || 
                options.url.indexOf('otp') !== -1 ||
                options.url.indexOf('miniorange') !== -1
            )) || (options.data && (
                (typeof options.data === 'string' && (options.data.indexOf('otp') !== -1 || options.data.indexOf('miniorange') !== -1)) ||
                (typeof options.data === 'object' && (options.data.action && (
                    options.data.action.indexOf('otp') !== -1 || 
                    options.data.action.indexOf('miniorange') !== -1 ||
                    options.data.action === 'mo_external_popup_option'
                )))
            ));
            
            // Wrap success callback to check for puzzle_required
            options.success = function(response, textStatus, jqXHR) {
                // Check if this is an external popup request
                const isExternalPopupRequest = options.data && (
                    (typeof options.data === 'object' && options.data.action === 'mo_external_popup_option') ||
                    (typeof options.data === 'string' && options.data.indexOf('mo_external_popup_option') !== -1)
                );
                
                // Check if puzzle is required - if so, store the request for resubmission
                if (isOtpRequest && response && (response.result === 'puzzle_required' || response.puzzle_required === true || response.authType === 'PUZZLE_REQUIRED')) {
                    window.mo_osp_pending_ajax_request = {
                        url: options.url,
                        type: options.type || 'POST',
                        data: typeof options.data === 'string' ? options.data : (options.data ? JSON.parse(JSON.stringify(options.data)) : {}),
                        dataType: options.dataType || 'json',
                        crossDomain: options.crossDomain || false,
                        originalSuccess: originalSuccess,
                        originalError: originalError
                    };
                }
                
                // CRITICAL: Skip interceptAjaxResponse for external popup success responses
                // External popup handles its own success/error messages and shouldn't be overwritten
                if (isExternalPopupRequest && response && response.result === 'success') {
                    // Call original success callback without intercepting
                    if (originalSuccess) {
                        originalSuccess.apply(this, arguments);
                    }
                    return;
                }
                
                // Call interceptAjaxResponse if response has message
                if (response && (response.message || response.result)) {
                    interceptAjaxResponse(response, null);
                }
                
                // Call original success callback
                if (originalSuccess) {
                    originalSuccess.apply(this, arguments);
                }
            };
            
            // Wrap error callback
            options.error = function(jqXHR, textStatus, errorThrown) {
                // Try to parse error response
                try {
                    const response = jqXHR.responseJSON || JSON.parse(jqXHR.responseText);
                    
                    // Check if puzzle is required in error response
                    if (isOtpRequest && response && (response.result === 'puzzle_required' || response.puzzle_required === true || response.authType === 'PUZZLE_REQUIRED')) {
                        window.mo_osp_pending_ajax_request = {
                            url: options.url,
                            type: options.type || 'POST',
                            data: typeof options.data === 'string' ? options.data : (options.data ? JSON.parse(JSON.stringify(options.data)) : {}),
                            dataType: options.dataType || 'json',
                            crossDomain: options.crossDomain || false,
                            originalSuccess: originalSuccess,
                            originalError: originalError
                        };
                    }
                    
                    if (response && (response.message || response.result)) {
                        interceptAjaxResponse(response, null);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
                
                // Call original error callback
                if (originalError) {
                    originalError.apply(this, arguments);
                }
            };
            
            // Call original ajax
            return originalAjax.apply(this, arguments);
        };
    }

    /**
     * Check message element and add timer if needed
     */
    function checkAndAddTimerToMessage($messageElement) {
        if (!$messageElement || $messageElement.length === 0) {
            return;
        }
        
        const messageText = $messageElement.text() || '';
        
        if (!messageText.trim()) {
            return;
        }
        
        // PRIORITY: Check if it's a blocked/error message with timer
        // Error messages should always replace success messages, even if timer is already added
        if (messageText.includes('exceeded') && messageText.includes('limit')) {
            
            const timerActive = $messageElement.data('mo-osp-timer-active');
            
            // Check if we've already processed this exact error message to prevent infinite loops
            const lastProcessedError = $messageElement.data('mo-osp-last-processed-error');
            if (lastProcessedError === messageText && timerActive) {
                return;
            }
            
            // CRITICAL: Set error flag FIRST, then stop timer
            // This ensures that if the timer interval callback is already queued, it will see the flag and stop
            $messageElement.data('mo-osp-error-message', true);
            $messageElement.data('mo-osp-last-processed-error', messageText);
            
            // IMPORTANT: Set the error message text IMMEDIATELY
            // This prevents the success timer (if still running) from overwriting it
            // But only if the current text is different to avoid triggering unnecessary mutations
            const currentText = $messageElement.text() || '';
            if (currentText !== messageText) {
                $messageElement.text(messageText);
            }
            $messageElement.css({
                'background-color': '#ffefef',
                'color': '#ff5b5b'
            });
            $messageElement.show();
            
            const totalSeconds = extractTimerFromMessage(messageText);
            if (totalSeconds > 0) {
                // Check if interceptAjaxResponse already handled this error message
                // If the timer is active and the error flag is set, interceptAjaxResponse likely already started it
                if (timerActive && $messageElement.data('mo-osp-error-message')) {
                    return;
                }
                
                // CRITICAL: ALWAYS stop any active timer when error message is detected
                // The success timer might be running and overwriting the error message
                // We MUST stop it immediately, regardless of what the current text says
                if (timerActive) {
                    // Clear all active timers (whether success or error)
                    activeTimers.forEach(function(timer) {
                        clearInterval(timer);
                    });
                    activeTimers = [];
                    // Clear flags AFTER clearing timers to ensure clean state
                    $messageElement.data('mo-osp-timer-active', false);
                    $messageElement.data('mo-osp-timer-added', false);
                }
                
                // Set timer-added flag (but NOT timer-active - let startTimer set that)
                $messageElement.data('mo-osp-timer-added', true);
                
                // Store error response for potential restoration if overwritten
                window.mo_osp_last_error_response = {
                    blocked: true,
                    message: messageText,
                    remaining_time: totalSeconds,
                    result: 'error'
                };
                
                const $button = findButtonForMessage($messageElement);
                startBlockTimer(totalSeconds, $button, $messageElement, messageText);
                return;
            }
        }
        
        // Check if it's a success message (OTP sent) - but only if it doesn't already have a timer
        // AND if there's no active error message.
        // IMPORTANT: Avoid triggering on "send OTP" prompts (e.g. "Click Here to send OTP").
        const looksLikeSendPrompt = /click\s+here\s+to\s+send\s+otp|send\s+otp/i.test(messageText);
        const looksLikeSentMessage = /sent|otp\s+sent|has\s+been\s+sent|passcode/i.test(messageText);
        if (looksLikeSentMessage && !looksLikeSendPrompt &&
            !messageText.match(/\d{1,2}:\d{2}\s*(remaining|minutes?|mins?)/i)) {
            
            // Check if we have an active error message - if so, don't process success message
            if ($messageElement.data('mo-osp-error-message')) {
                return;
            }
            
            // Skip if timer already added (only for success messages)
            if ($messageElement.data('mo-osp-timer-added')) {
                return;
            }
            $messageElement.data('mo-osp-timer-added', true);
            
            // Get actual remaining cooldown time from backend
            const email = getEmailFromForm();
            const phone = getPhoneFromForm();
            
            if (typeof mo_osp_ajax !== 'undefined') {
                $mo.ajax({
                    url: mo_osp_ajax.ajax_url,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'mo_osp_check_blocked',
                        nonce: mo_osp_ajax.nonce,
                        mo_osp_browser_id: currentBrowserID,
                        email: email,
                        phone: phone
                    },
                    success: function(cooldownResponse) {
                        // Handle WordPress JSON success wrapper
                        if (cooldownResponse && cooldownResponse.data) {
                            cooldownResponse = cooldownResponse.data;
                        }
                        
                        let cooldownTime = 0;
                        if (cooldownResponse && cooldownResponse.cooldown && cooldownResponse.remaining_time > 0) {
                            cooldownTime = parseInt(cooldownResponse.remaining_time);
                        } else {
                            cooldownTime = (typeof mo_osp_ajax !== 'undefined' && mo_osp_ajax.timer_time) 
                                ? parseInt(mo_osp_ajax.timer_time) : 60;
                        }
                        if (cooldownTime > 0) {
                            const $button = findButtonForMessage($messageElement);
                            startCooldownTimer(cooldownTime, $button, $messageElement, messageText);
                        } else {
                            // No cooldown, show button
                            const $button = findButtonForMessage($messageElement);
                            if ($button && $button.length > 0) {
                                $button.show();
                            }
                            $messageElement.data('mo-osp-timer-added', false); // Allow retry
                        }
                    },
                    error: function(xhr, status, error) {
                        // If response is HTML (error page), treat as no cooldown to allow OTP send
                        if (xhr.responseText && xhr.responseText.trim().startsWith('<')) {
                            // HTML response - likely an error page, skip timer
                            const $button = findButtonForMessage($messageElement);
                            if ($button && $button.length > 0) {
                                $button.show();
                            }
                            $messageElement.data('mo-osp-timer-added', false);
                            return;
                        }
                        const defaultTime = (typeof mo_osp_ajax !== 'undefined' && mo_osp_ajax.timer_time) 
                            ? parseInt(mo_osp_ajax.timer_time) : 60;
                        const $button = findButtonForMessage($messageElement);
                        startCooldownTimer(defaultTime, $button, $messageElement, messageText);
                    }
                });
            } else {
                // Fallback if mo_osp_ajax is not available
                const defaultTime = 60;
                const $button = findButtonForMessage($messageElement);
                startCooldownTimer(defaultTime, $button, $messageElement, messageText);
            }
        }
    }

    // Initialize when document is ready (resendcontrol pattern)
    $mo(document).ready(function() {
        setTimeout(function() {
            initializeSpamPreventer();
            setupAjaxInterceptor();
        }, 100);
    });

})(jQuery);
