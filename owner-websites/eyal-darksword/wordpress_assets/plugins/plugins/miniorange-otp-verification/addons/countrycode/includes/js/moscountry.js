jQuery(function ($) {
	'use strict';

	var $mo = $;

	/**
	 * Escape HTML entities to prevent XSS attacks.
	 *
	 * @param {string} text - Text to escape.
	 * @return {string} Escaped text.
	 */
	function escapeHtml(text) {
		if (typeof text !== 'string') {
			return '';
		}
		var map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, function (m) {
			return map[m];
		});
	}

	/**
	 * Sanitize country name by removing dangerous characters while preserving
	 * special characters like "&" or "'" so names continue to match server data.
	 *
	 * @param {string} countryName - Country name to sanitize.
	 * @return {string} Sanitized country name.
	 */
	function sanitizeCountryName(countryName) {
		if (typeof countryName !== 'string') {
			return '';
		}
		// Remove any control characters, newlines, and excessive whitespace.
		var cleaned = countryName.replace(/[\x00-\x1F\x7F]/g, '').trim();
		// Remove semicolons to prevent format breaking.
		cleaned = cleaned.replace(/;/g, '');
		// Strip rudimentary HTML tags while keeping special characters intact.
		return cleaned.replace(/[<>]/g, '');
	}

	var countryOptionSelected = '';
	var disableSelectoption = true;
	var blockCountryOptionSelected = '';
	var blockcountrydisableSelectoption = true;

	$mo('#country_dropdown').change(function () {
		$mo(this).find('option:selected').each(function () {
			var rawText = $mo(this).text();
			countryOptionSelected = sanitizeCountryName(rawText);
		});

		if (disableSelectoption) {
			disableSelectoption = false;
			return;
		}

		// Compare against the exact placeholder text from the view (3 dashes on each side).
		if (countryOptionSelected !== '' && countryOptionSelected.trim() !== '---Select Your Country---') {
			var currentValue = $mo('#mo_selected_country_numbers').val() || '';
			// Ensure we don't add duplicates.
			var countriesList = currentValue.split(';').map(function (c) {
				return c.trim();
			}).filter(function (c) {
				return c !== '';
			});

			// Check if country is already in the list.
			if (countriesList.indexOf(countryOptionSelected) === -1) {
				countriesList.push(countryOptionSelected);
				var newValue = countriesList.join('; ') + ';';
				$mo('#mo_selected_country_numbers').val(newValue);
			}
		}
	}).change();

	$mo('#country_block_dropdown').change(function () {
		$mo(this).find('option:selected').each(function () {
			var rawText = $mo(this).text();
			blockCountryOptionSelected = sanitizeCountryName(rawText);
		});

		if (blockcountrydisableSelectoption) {
			blockcountrydisableSelectoption = false;
			return;
		}

		// Compare against the exact placeholder text from the view (3 dashes on each side).
		if (blockCountryOptionSelected !== '' && blockCountryOptionSelected.trim() !== '---Select Your Country---') {
			var currentValue = $mo('#mo_block_selected_country_numbers').val() || '';
			// Ensure we don't add duplicates.
			var countriesList = currentValue.split(';').map(function (c) {
				return c.trim();
			}).filter(function (c) {
				return c !== '';
			});

			// Check if country is already in the list.
			if (countriesList.indexOf(blockCountryOptionSelected) === -1) {
				countriesList.push(blockCountryOptionSelected);
				var newValue = countriesList.join('; ') + ';';
				$mo('#mo_block_selected_country_numbers').val(newValue);
			}
		}
	}).change();

});