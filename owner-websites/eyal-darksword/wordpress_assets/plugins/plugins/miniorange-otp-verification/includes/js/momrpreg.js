/* global momrpreg */
(function(window, document) {
	'use strict';

	document.addEventListener('DOMContentLoaded', function() {
		if (typeof momrpreg === 'undefined' || !momrpreg.nonce) {
			return;
		}

		// Try common MemberPress registration form selectors.
		var form = document.querySelector('form.mepr-signup-form, form[data-mepr-form="registration"]');
		if (!form) {
			return;
		}

		// Avoid adding the field twice.
		if (form.querySelector('input[name="mepr_register_nonce"]')) {
			return;
		}

		var input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'mepr_register_nonce';
		input.value = momrpreg.nonce;
		form.appendChild(input);
	});
})(window, document);


