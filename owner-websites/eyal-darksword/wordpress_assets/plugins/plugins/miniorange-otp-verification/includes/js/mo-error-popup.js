// Dedicated script for the Error OTP popup.
// Provides the global `mo_validation_goback` helper and also
// explicitly binds click handlers to the close button.
(function (window, document) {
	'use strict';

	function mo_validation_goback() {
		var form = document.getElementById('validation_goBack_form');
		if (form) {
			form.submit();
		}
	}

	function bindErrorPopupClose() {
		var closeButtons = document.querySelectorAll('.mo_customer_validation-modal .close');
		if (!closeButtons || !closeButtons.length) {
			return;
		}

		closeButtons.forEach(function (btn) {
			btn.addEventListener('click', function (e) {
				if (e && typeof e.preventDefault === 'function') {
					e.preventDefault();
				}
				mo_validation_goback();
			});
		});
	}

	/**
	 * Extract time from error message (e.g., "00:58 minutes" or "58 seconds")
	 * Returns time in seconds, or null if no time found
	 */
	function extractTimeFromMessage(message) {
		// Try to match "MM:SS minutes" format
		var timeMatch = message.match(/(\d{1,2}):(\d{2})\s*(?:minutes?|mins?)/i);
		if (timeMatch) {
			var minutes = parseInt(timeMatch[1], 10);
			var seconds = parseInt(timeMatch[2], 10);
			return (minutes * 60) + seconds;
		}

		// Try to match "XX minutes" format
		var minutesMatch = message.match(/(\d+)\s*(?:minutes?|mins?)/i);
		if (minutesMatch) {
			return parseInt(minutesMatch[1], 10) * 60;
		}

		// Try to match "XX seconds" format
		var secondsMatch = message.match(/(\d+)\s*(?:seconds?|secs?)/i);
		if (secondsMatch) {
			return parseInt(secondsMatch[1], 10);
		}

		return null;
	}

	/**
	 * Format seconds as MM:SS
	 */
	function formatTime(seconds) {
		var mins = Math.floor(seconds / 60);
		var secs = seconds % 60;
		return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
	}

	/**
	 * Handle countdown timer in error popup message
	 */
	function handleErrorPopupTimer() {
		var popupBody = document.querySelector('.mo_customer_validation-modal-body');
		if (!popupBody) {
			return;
		}

		var messageDiv = popupBody.querySelector('div');
		if (!messageDiv) {
			return;
		}

		var messageText = messageDiv.textContent.trim();
		var timeLeft = extractTimeFromMessage(messageText);

		if (!timeLeft || timeLeft <= 0) {
			return; // No timer found in message
		}

		// Extract base message without timer
		var baseMessage = messageText;
		// Remove timer patterns to get clean base message
		baseMessage = baseMessage.replace(/\d{1,2}:\d{2}\s*(?:minutes?|mins?)/gi, '__TIMER__')
			.replace(/\d+\s*(?:minutes?|mins?)/gi, '__TIMER__')
			.replace(/\d+\s*(?:seconds?|secs?)/gi, '__TIMER__');

		var remainingTime = timeLeft;
		var intervalId = setInterval(function () {
			remainingTime--;

			if (remainingTime < 0) {
				clearInterval(intervalId);
				// Timer ended - close popup or reload
				mo_validation_goback();
				return;
			}

			// Update message with current time
			var timeString = formatTime(remainingTime);
			var updatedMessage = baseMessage.replace(/__TIMER__/g, timeString + ' minutes');
			messageDiv.textContent = updatedMessage;
		}, 1000);

		// Update immediately on first call
		var timeString = formatTime(remainingTime);
		var updatedMessage = baseMessage.replace(/__TIMER__/g, timeString + ' minutes');
		messageDiv.textContent = updatedMessage;
	}

	/**
	 * Initialize error popup functionality
	 */
	function initErrorPopup() {
		bindErrorPopupClose();
		
		// Wait a bit for popup to fully render before checking for timer
		setTimeout(function() {
			handleErrorPopupTimer();
		}, 100);
	}

	// Expose globally so inline onclick="{{GO_BACK_ACTION_CALL}}" can access it.
	window.mo_validation_goback = mo_validation_goback;

	// Ensure binding happens regardless of when the script loads.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initErrorPopup);
	} else {
		initErrorPopup();
	}
})(window, document);
