<?php
/**
 * Contains List of countries to be shown in dropdown.
 * Contains functions for getting default country, country code set.
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This class lists down all the countries and their country code.
 * It also lists down a few country code related functions.
 */
if ( ! class_exists( 'CountryList' ) ) {
	/**
	 * CountryList class
	 */
	class CountryList {

		/**Country List
		 *
		 * @var $countries
		 */
		public static $countries = array(
			array(
				'name'        => 'All Countries',
				'alphacode'   => '',
				'countryCode' => '',
			),
			array(
				'name'        => 'Afghanistan (‫افغانستان‬‎)',
				'alphacode'   => 'af',
				'countryCode' => '+93',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Albania (Shqipëri)',
				'alphacode'   => 'al',
				'countryCode' => '+355',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Algeria (‫الجزائر‬‎)',
				'alphacode'   => 'dz',
				'countryCode' => '+213',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'American Samoa',
				'alphacode'   => 'as',
				'countryCode' => '+1684',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Andorra',
				'alphacode'   => 'ad',
				'countryCode' => '+376',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '1', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Angola',
				'alphacode'   => 'ao',
				'countryCode' => '+244',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '9' ),
			),
			array(
				'name'        => 'Anguilla',
				'alphacode'   => 'ai',
				'countryCode' => '+1264',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Antigua and Barbuda',
				'alphacode'   => 'ag',
				'countryCode' => '+1268',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Argentina',
				'alphacode'   => 'ar',
				'countryCode' => '+54',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Armenia (Հայաստան)',
				'alphacode'   => 'am',
				'countryCode' => '+374',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Aruba',
				'alphacode'   => 'aw',
				'countryCode' => '+297',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Australia',
				'alphacode'   => 'au',
				'countryCode' => '+61',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '7', '8' ),
			),
			array(
				'name'        => 'Austria (Österreich)',
				'alphacode'   => 'at',
				'countryCode' => '+43',
				'minLength'   => 10,
				'maxLength'   => 13,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Azerbaijan (Azərbaycan)',
				'alphacode'   => 'az',
				'countryCode' => '+994',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Bahamas',
				'alphacode'   => 'bs',
				'countryCode' => '+1242',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Bahrain (‫البحرين‬‎)',
				'alphacode'   => 'bh',
				'countryCode' => '+973',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Bangladesh (বাংলাদেশ)',
				'alphacode'   => 'bd',
				'countryCode' => '+880',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Barbados',
				'alphacode'   => 'bb',
				'countryCode' => '+1246',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Belarus (Беларусь)',
				'alphacode'   => 'by',
				'countryCode' => '+375',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '8', '9' ),
			),
			array(
				'name'        => 'Belgium (België)',
				'alphacode'   => 'be',
				'countryCode' => '+32',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Belize',
				'alphacode'   => 'bz',
				'countryCode' => '+501',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '0', '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Benin (Bénin)',
				'alphacode'   => 'bj',
				'countryCode' => '+229',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '4', '5', '6', '8', '9' ),
			),
			array(
				'name'        => 'Bermuda',
				'alphacode'   => 'bm',
				'countryCode' => '+1441',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Bhutan (འབྲུག)',
				'alphacode'   => 'bt',
				'countryCode' => '+975',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Bolivia',
				'alphacode'   => 'bo',
				'countryCode' => '+591',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Bosnia and Herzegovina (Босна и Херцеговина)',
				'alphacode'   => 'ba',
				'countryCode' => '+387',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Botswana',
				'alphacode'   => 'bw',
				'countryCode' => '+267',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Brazil (Brasil)',
				'alphacode'   => 'br',
				'countryCode' => '+55',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'British Indian Ocean Territory',
				'alphacode'   => 'io',
				'countryCode' => '+246',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '3' ),
			),
			array(
				'name'        => 'British Virgin Islands',
				'alphacode'   => 'vg',
				'countryCode' => '+1284',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Brunei',
				'alphacode'   => 'bn',
				'countryCode' => '+673',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Bulgaria (България)',
				'alphacode'   => 'bg',
				'countryCode' => '+359',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Burkina Faso',
				'alphacode'   => 'bf',
				'countryCode' => '+226',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Burundi (Uburundi)',
				'alphacode'   => 'bi',
				'countryCode' => '+257',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '6', '7' ),
			),
			array(
				'name'        => 'Cambodia (កម្ពុជា)',
				'alphacode'   => 'kh',
				'countryCode' => '+855',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Cameroon (Cameroun)',
				'alphacode'   => 'cm',
				'countryCode' => '+237',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '6', '8' ),
			),
			array(
				'name'        => 'Canada',
				'alphacode'   => 'ca',
				'countryCode' => '+1',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Cape Verde (Kabu Verdi)',
				'alphacode'   => 'cv',
				'countryCode' => '+238',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '8', '9' ),
			),
			array(
				'name'        => 'Caribbean Netherlands',
				'alphacode'   => 'bq',
				'countryCode' => '+599',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Cayman Islands',
				'alphacode'   => 'ky',
				'countryCode' => '+1345',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Central African Republic (République centrafricaine)',
				'alphacode'   => 'cf',
				'countryCode' => '+236',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '7', '8' ),
			),
			array(
				'name'        => 'Chad (Tchad)',
				'alphacode'   => 'td',
				'countryCode' => '+235',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Chile',
				'alphacode'   => 'cl',
				'countryCode' => '+56',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'China (中国)',
				'alphacode'   => 'cn',
				'countryCode' => '+86',
				'minLength'   => 11,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Christmas Island',
				'alphacode'   => 'cx',
				'countryCode' => '+61',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '4', '8' ),
			),
			array(
				'name'        => 'Cocos (Keeling) Islands',
				'alphacode'   => 'cc',
				'countryCode' => '+61',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '4', '8' ),
			),
			array(
				'name'        => 'Colombia',
				'alphacode'   => 'co',
				'countryCode' => '+57',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '3', '4', '6', '9' ),
			),
			array(
				'name'        => 'Comoros (‫جزر القمر‬‎)',
				'alphacode'   => 'km',
				'countryCode' => '+269',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '3', '4', '7', '8' ),
			),
			array(
				'name'        => 'Congo (DRC) (Jamhuri ya Kidemokrasia ya Kongo)',
				'alphacode'   => 'cd',
				'countryCode' => '+243',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '8', '9' ),
			),
			array(
				'name'        => 'Congo (Republic) (Congo-Brazzaville)',
				'alphacode'   => 'cg',
				'countryCode' => '+242',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '2', '8' ),
			),
			array(
				'name'        => 'Cook Islands',
				'alphacode'   => 'ck',
				'countryCode' => '+682',
				'minLength'   => 5,
				'maxLength'   => 5,
				'prefixes'    => array( '2', '3', '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Costa Rica',
				'alphacode'   => 'cr',
				'countryCode' => '+506',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Côte d\'Ivoire',
				'alphacode'   => 'ci',
				'countryCode' => '+225',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '2' ),
			),
			array(
				'name'        => 'Croatia (Hrvatska)',
				'alphacode'   => 'hr',
				'countryCode' => '+385',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Cuba',
				'alphacode'   => 'cu',
				'countryCode' => '+53',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Curaçao',
				'alphacode'   => 'cw',
				'countryCode' => '+599',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '3', '4', '6', '7', '9' ),
			),
			array(
				'name'        => 'Cyprus (Κύπρος)',
				'alphacode'   => 'cy',
				'countryCode' => '+357',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Czech Republic (Česká republika)',
				'alphacode'   => 'cz',
				'countryCode' => '+420',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Denmark (Danmark)',
				'alphacode'   => 'dk',
				'countryCode' => '+45',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Djibouti',
				'alphacode'   => 'dj',
				'countryCode' => '+253',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '7' ),
			),
			array(
				'name'        => 'Dominica',
				'alphacode'   => 'dm',
				'countryCode' => '+1767',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Dominican Republic (República Dominicana)',
				'alphacode'   => 'do',
				'countryCode' => '+1',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Ecuador',
				'alphacode'   => 'ec',
				'countryCode' => '+593',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '9' ),
			),
			array(
				'name'        => 'Egypt (‫مصر‬‎)',
				'alphacode'   => 'eg',
				'countryCode' => '+20',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '8', '9' ),
			),
			array(
				'name'        => 'El Salvador',
				'alphacode'   => 'sv',
				'countryCode' => '+503',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Equatorial Guinea (Guinea Ecuatorial)',
				'alphacode'   => 'gq',
				'countryCode' => '+240',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '5', '8', '9' ),
			),
			array(
				'name'        => 'Eritrea',
				'alphacode'   => 'er',
				'countryCode' => '+291',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '1', '7', '8' ),
			),
			array(
				'name'        => 'Estonia (Eesti)',
				'alphacode'   => 'ee',
				'countryCode' => '+372',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Ethiopia',
				'alphacode'   => 'et',
				'countryCode' => '+251',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '7', '9' ),
			),
			array(
				'name'        => 'Falkland Islands (Islas Malvinas)',
				'alphacode'   => 'fk',
				'countryCode' => '+500',
				'minLength'   => 5,
				'maxLength'   => 5,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Faroe Islands (Føroyar)',
				'alphacode'   => 'fo',
				'countryCode' => '+298',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Fiji',
				'alphacode'   => 'fj',
				'countryCode' => '+679',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '0', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Finland (Suomi)',
				'alphacode'   => 'fi',
				'countryCode' => '+358',
				'minLength'   => 5,
				'maxLength'   => 12,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'France',
				'alphacode'   => 'fr',
				'countryCode' => '+33',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'French Guiana (Guyane française)',
				'alphacode'   => 'gf',
				'countryCode' => '+594',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'French Polynesia (Polynésie française)',
				'alphacode'   => 'pf',
				'countryCode' => '+689',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '4', '8' ),
			),
			array(
				'name'        => 'Gabon',
				'alphacode'   => 'ga',
				'countryCode' => '+241',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Gambia',
				'alphacode'   => 'gm',
				'countryCode' => '+220',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Georgia (საქართველო)',
				'alphacode'   => 'ge',
				'countryCode' => '+995',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '3', '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Germany (Deutschland)',
				'alphacode'   => 'de',
				'countryCode' => '+49',
				'minLength'   => 11,
				'maxLength'   => 12,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Ghana (Gaana)',
				'alphacode'   => 'gh',
				'countryCode' => '+233',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '5', '7', '8' ),
			),
			array(
				'name'        => 'Gibraltar',
				'alphacode'   => 'gi',
				'countryCode' => '+350',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2' ),
			),
			array(
				'name'        => 'Greece (Ελλάδα)',
				'alphacode'   => 'gr',
				'countryCode' => '+30',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Greenland (Kalaallit Nunaat)',
				'alphacode'   => 'gl',
				'countryCode' => '+299',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Grenada',
				'alphacode'   => 'gd',
				'countryCode' => '+1473',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Guadeloupe',
				'alphacode'   => 'gp',
				'countryCode' => '+590',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Guam',
				'alphacode'   => 'gu',
				'countryCode' => '+1671',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Guatemala',
				'alphacode'   => 'gt',
				'countryCode' => '+502',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Guernsey',
				'alphacode'   => 'gg',
				'countryCode' => '+44',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Guinea (Guinée)',
				'alphacode'   => 'gn',
				'countryCode' => '+224',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '3', '6', '7' ),
			),
			array(
				'name'        => 'Guinea-Bissau (Guiné Bissau)',
				'alphacode'   => 'gw',
				'countryCode' => '+245',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '4', '9' ),
			),
			array(
				'name'        => 'Guyana',
				'alphacode'   => 'gy',
				'countryCode' => '+592',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Haiti',
				'alphacode'   => 'ht',
				'countryCode' => '+509',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '8', '9' ),
			),
			array(
				'name'        => 'Honduras',
				'alphacode'   => 'hn',
				'countryCode' => '+504',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '7', '8', '9' ),
			),
			array(
				'name'        => 'Hong Kong (香港)',
				'alphacode'   => 'hk',
				'countryCode' => '+852',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Hungary (Magyarország)',
				'alphacode'   => 'hu',
				'countryCode' => '+36',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Iceland (Ísland)',
				'alphacode'   => 'is',
				'countryCode' => '+354',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'India (भारत)',
				'alphacode'   => 'in',
				'countryCode' => '+91',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Indonesia',
				'alphacode'   => 'id',
				'countryCode' => '+62',
				'minLength'   => 8,
				'maxLength'   => 12,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Iran (‫ایران‬‎)',
				'alphacode'   => 'ir',
				'countryCode' => '+98',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Iraq (‫العراق‬‎)',
				'alphacode'   => 'iq',
				'countryCode' => '+964',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Ireland',
				'alphacode'   => 'ie',
				'countryCode' => '+353',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Isle of Man',
				'alphacode'   => 'im',
				'countryCode' => '+44',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Israel (‫ישראל‬‎)',
				'alphacode'   => 'il',
				'countryCode' => '+972',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Italy (Italia)',
				'alphacode'   => 'it',
				'countryCode' => '+39',
				'minLength'   => 9,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '3', '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Jamaica',
				'alphacode'   => 'jm',
				'countryCode' => '+1876',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Japan (日本)',
				'alphacode'   => 'jp',
				'countryCode' => '+81',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Jersey',
				'alphacode'   => 'je',
				'countryCode' => '+44',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Jordan (‫الأردن‬‎)',
				'alphacode'   => 'jo',
				'countryCode' => '+962',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Kazakhstan (Казахстан)',
				'alphacode'   => 'kz',
				'countryCode' => '+7',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Kenya',
				'alphacode'   => 'ke',
				'countryCode' => '+254',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Kiribati',
				'alphacode'   => 'ki',
				'countryCode' => '+686',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Kosovo',
				'alphacode'   => 'xk',
				'countryCode' => '+383',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '8', '9' ),
			),
			array(
				'name'        => 'Kuwait (‫الكويت‬‎)',
				'alphacode'   => 'kw',
				'countryCode' => '+965',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '4', '5', '6', '9' ),
			),
			array(
				'name'        => 'Kyrgyzstan (Кыргызстан)',
				'alphacode'   => 'kg',
				'countryCode' => '+996',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Laos (ລາວ)',
				'alphacode'   => 'la',
				'countryCode' => '+856',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Latvia (Latvija)',
				'alphacode'   => 'lv',
				'countryCode' => '+371',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Lebanon (‫لبنان‬‎)',
				'alphacode'   => 'lb',
				'countryCode' => '+961',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Lesotho',
				'alphacode'   => 'ls',
				'countryCode' => '+266',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '5', '6', '8' ),
			),
			array(
				'name'        => 'Liberia',
				'alphacode'   => 'lr',
				'countryCode' => '+231',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Libya (‫ليبيا‬‎)',
				'alphacode'   => 'ly',
				'countryCode' => '+218',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Liechtenstein',
				'alphacode'   => 'li',
				'countryCode' => '+423',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Lithuania (Lietuva)',
				'alphacode'   => 'lt',
				'countryCode' => '+370',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Luxembourg',
				'alphacode'   => 'lu',
				'countryCode' => '+352',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Macau (澳門)',
				'alphacode'   => 'mo',
				'countryCode' => '+853',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '6', '8' ),
			),
			array(
				'name'        => 'Macedonia (FYROM) (Македонија)',
				'alphacode'   => 'mk',
				'countryCode' => '+389',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Madagascar (Madagasikara)',
				'alphacode'   => 'mg',
				'countryCode' => '+261',
				'minLength'   => 9,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3' ),
			),
			array(
				'name'        => 'Malawi',
				'alphacode'   => 'mw',
				'countryCode' => '+265',
				'minLength'   => 7,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '7', '8', '9' ),
			),
			array(
				'name'        => 'Malaysia',
				'alphacode'   => 'my',
				'countryCode' => '+60',
				'minLength'   => 9,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Maldives',
				'alphacode'   => 'mv',
				'countryCode' => '+960',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '3', '4', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Mali',
				'alphacode'   => 'ml',
				'countryCode' => '+223',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Malta',
				'alphacode'   => 'mt',
				'countryCode' => '+356',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Marshall Islands',
				'alphacode'   => 'mh',
				'countryCode' => '+692',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6' ),
			),
			array(
				'name'        => 'Martinique',
				'alphacode'   => 'mq',
				'countryCode' => '+596',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Mauritania (‫موريتانيا‬‎)',
				'alphacode'   => 'mr',
				'countryCode' => '+222',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '8' ),
			),
			array(
				'name'        => 'Mauritius (Moris)',
				'alphacode'   => 'mu',
				'countryCode' => '+230',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Mayotte',
				'alphacode'   => 'yt',
				'countryCode' => '+262',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Mexico (México)',
				'alphacode'   => 'mx',
				'countryCode' => '+52',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Micronesia',
				'alphacode'   => 'fm',
				'countryCode' => '+691',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '3', '8', '9' ),
			),
			array(
				'name'        => 'Moldova (Republica Moldova)',
				'alphacode'   => 'md',
				'countryCode' => '+373',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Monaco',
				'alphacode'   => 'mc',
				'countryCode' => '+377',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '3', '4', '6', '8', '9' ),
			),
			array(
				'name'        => 'Mongolia (Монгол)',
				'alphacode'   => 'mn',
				'countryCode' => '+976',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Montenegro (Crna Gora)',
				'alphacode'   => 'me',
				'countryCode' => '+382',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Montserrat',
				'alphacode'   => 'ms',
				'countryCode' => '+1664',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Morocco (‫المغرب‬‎)',
				'alphacode'   => 'ma',
				'countryCode' => '+212',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Mozambique (Moçambique)',
				'alphacode'   => 'mz',
				'countryCode' => '+258',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '8' ),
			),
			array(
				'name'        => 'Myanmar (Burma) (မြန်မာ)',
				'alphacode'   => 'mm',
				'countryCode' => '+95',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Namibia (Namibië)',
				'alphacode'   => 'na',
				'countryCode' => '+264',
				'minLength'   => 7,
				'maxLength'   => 9,
				'prefixes'    => array( '6', '8' ),
			),
			array(
				'name'        => 'Nauru',
				'alphacode'   => 'nr',
				'countryCode' => '+674',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Nepal (नेपाल)',
				'alphacode'   => 'np',
				'countryCode' => '+977',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Netherlands (Nederland)',
				'alphacode'   => 'nl',
				'countryCode' => '+31',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'New Caledonia (Nouvelle-Calédonie)',
				'alphacode'   => 'nc',
				'countryCode' => '+687',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '0', '2', '3', '4', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'New Zealand',
				'alphacode'   => 'nz',
				'countryCode' => '+64',
				'minLength'   => 8,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Nicaragua',
				'alphacode'   => 'ni',
				'countryCode' => '+505',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Niger (Nijar)',
				'alphacode'   => 'ne',
				'countryCode' => '+227',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '7', '8', '9' ),
			),
			array(
				'name'        => 'Nigeria',
				'alphacode'   => 'ng',
				'countryCode' => '+234',
				'minLength'   => 7,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '7', '8', '9' ),
			),
			array(
				'name'        => 'Niue',
				'alphacode'   => 'nu',
				'countryCode' => '+683',
				'minLength'   => 4,
				'maxLength'   => 4,
				'prefixes'    => array( '8' ),
			),
			array(
				'name'        => 'Norfolk Island',
				'alphacode'   => 'nf',
				'countryCode' => '+672',
				'minLength'   => 5,
				'maxLength'   => 6,
				'prefixes'    => array( '1', '3' ),
			),
			array(
				'name'        => 'North Korea (조선 민주주의 인민 공화국)',
				'alphacode'   => 'kp',
				'countryCode' => '+850',
				'minLength'   => 8,
				'maxLength'   => 12,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Northern Mariana Islands',
				'alphacode'   => 'mp',
				'countryCode' => '+1670',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Norway (Norge)',
				'alphacode'   => 'no',
				'countryCode' => '+47',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Oman (‫عُمان‬‎)',
				'alphacode'   => 'om',
				'countryCode' => '+968',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Pakistan (‫پاکستان‬‎)',
				'alphacode'   => 'pk',
				'countryCode' => '+92',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Palau',
				'alphacode'   => 'pw',
				'countryCode' => '+680',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Palestine (‫فلسطين‬‎)',
				'alphacode'   => 'ps',
				'countryCode' => '+970',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '4', '5', '8', '9' ),
			),
			array(
				'name'        => 'Panama (Panamá)',
				'alphacode'   => 'pa',
				'countryCode' => '+507',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Papua New Guinea',
				'alphacode'   => 'pg',
				'countryCode' => '+675',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Paraguay',
				'alphacode'   => 'py',
				'countryCode' => '+595',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Peru (Perú)',
				'alphacode'   => 'pe',
				'countryCode' => '+51',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Philippines',
				'alphacode'   => 'ph',
				'countryCode' => '+63',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Poland (Polska)',
				'alphacode'   => 'pl',
				'countryCode' => '+48',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Portugal',
				'alphacode'   => 'pt',
				'countryCode' => '+351',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Puerto Rico',
				'alphacode'   => 'pr',
				'countryCode' => '+1',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Qatar (‫قطر‬‎)',
				'alphacode'   => 'qa',
				'countryCode' => '+974',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Réunion (La Réunion)',
				'alphacode'   => 're',
				'countryCode' => '+262',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Romania (România)',
				'alphacode'   => 'ro',
				'countryCode' => '+40',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Russia (Россия)',
				'alphacode'   => 'ru',
				'countryCode' => '+7',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Rwanda',
				'alphacode'   => 'rw',
				'countryCode' => '+250',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '2', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Barthélemy',
				'alphacode'   => 'bl',
				'countryCode' => '+590',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Helena',
				'alphacode'   => 'sh',
				'countryCode' => '+290',
				'minLength'   => 4,
				'maxLength'   => 4,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Kitts and Nevis',
				'alphacode'   => 'kn',
				'countryCode' => '+1869',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Lucia',
				'alphacode'   => 'lc',
				'countryCode' => '+1758',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Martin (Saint-Martin (partie française))',
				'alphacode'   => 'mf',
				'countryCode' => '+590',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Saint Pierre and Miquelon (Saint-Pierre-et-Miquelon)',
				'alphacode'   => 'pm',
				'countryCode' => '+508',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '4', '5', '7', '8' ),
			),
			array(
				'name'        => 'Saint Vincent and the Grenadines',
				'alphacode'   => 'vc',
				'countryCode' => '+1784',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Samoa',
				'alphacode'   => 'ws',
				'countryCode' => '+685',
				'minLength'   => 5,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'San Marino',
				'alphacode'   => 'sm',
				'countryCode' => '+378',
				'minLength'   => 6,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'São Tomé and Príncipe (São Tomé e Príncipe)',
				'alphacode'   => 'st',
				'countryCode' => '+239',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '9' ),
			),
			array(
				'name'        => 'Saudi Arabia (‫المملكة العربية السعودية‬‎)',
				'alphacode'   => 'sa',
				'countryCode' => '+966',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '5', '8', '9' ),
			),
			array(
				'name'        => 'Senegal (Sénégal)',
				'alphacode'   => 'sn',
				'countryCode' => '+221',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '3', '7', '8', '9' ),
			),
			array(
				'name'        => 'Serbia (Србија)',
				'alphacode'   => 'rs',
				'countryCode' => '+381',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Seychelles',
				'alphacode'   => 'sc',
				'countryCode' => '+248',
				'minLength'   => 7,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '4', '6', '9' ),
			),
			array(
				'name'        => 'Sierra Leone',
				'alphacode'   => 'sl',
				'countryCode' => '+232',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Singapore',
				'alphacode'   => 'sg',
				'countryCode' => '+65',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '3', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Sint Maarten',
				'alphacode'   => 'sx',
				'countryCode' => '+1721',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Slovakia (Slovensko)',
				'alphacode'   => 'sk',
				'countryCode' => '+421',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '8', '9' ),
			),
			array(
				'name'        => 'Slovenia (Slovenija)',
				'alphacode'   => 'si',
				'countryCode' => '+386',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Solomon Islands',
				'alphacode'   => 'sb',
				'countryCode' => '+677',
				'minLength'   => 5,
				'maxLength'   => 7,
				'prefixes'    => array( '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Somalia (Soomaaliya)',
				'alphacode'   => 'so',
				'countryCode' => '+252',
				'minLength'   => 7,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'South Africa',
				'alphacode'   => 'za',
				'countryCode' => '+27',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'South Korea (대한민국)',
				'alphacode'   => 'kr',
				'countryCode' => '+82',
				'minLength'   => 9,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'South Sudan (‫جنوب السودان‬‎)',
				'alphacode'   => 'ss',
				'countryCode' => '+211',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '9' ),
			),
			array(
				'name'        => 'Spain (España)',
				'alphacode'   => 'es',
				'countryCode' => '+34',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Sri Lanka (ශ්‍රී ලංකාව)',
				'alphacode'   => 'lk',
				'countryCode' => '+94',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Sudan (‫السودان‬‎)',
				'alphacode'   => 'sd',
				'countryCode' => '+249',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '9' ),
			),
			array(
				'name'        => 'Suriname',
				'alphacode'   => 'sr',
				'countryCode' => '+597',
				'minLength'   => 6,
				'maxLength'   => 7,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Svalbard and Jan Mayen',
				'alphacode'   => 'sj',
				'countryCode' => '+47',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Swaziland',
				'alphacode'   => 'sz',
				'countryCode' => '+268',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '2', '3', '7', '9' ),
			),
			array(
				'name'        => 'Sweden (Sverige)',
				'alphacode'   => 'se',
				'countryCode' => '+46',
				'minLength'   => 7,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Switzerland (Schweiz)',
				'alphacode'   => 'ch',
				'countryCode' => '+41',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Syria (‫سوريا‬‎)',
				'alphacode'   => 'sy',
				'countryCode' => '+963',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '9' ),
			),
			array(
				'name'        => 'Taiwan (台灣)',
				'alphacode'   => 'tw',
				'countryCode' => '+886',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Tajikistan',
				'alphacode'   => 'tj',
				'countryCode' => '+992',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Tanzania',
				'alphacode'   => 'tz',
				'countryCode' => '+255',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Thailand (ไทย)',
				'alphacode'   => 'th',
				'countryCode' => '+66',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Timor-Leste',
				'alphacode'   => 'tl',
				'countryCode' => '+670',
				'minLength'   => 7,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '7', '8', '9' ),
			),
			array(
				'name'        => 'Togo',
				'alphacode'   => 'tg',
				'countryCode' => '+228',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '7', '9' ),
			),
			array(
				'name'        => 'Tokelau',
				'alphacode'   => 'tk',
				'countryCode' => '+690',
				'minLength'   => 4,
				'maxLength'   => 4,
				'prefixes'    => array( '2', '3', '4', '7' ),
			),
			array(
				'name'        => 'Tonga',
				'alphacode'   => 'to',
				'countryCode' => '+676',
				'minLength'   => 5,
				'maxLength'   => 5,
				'prefixes'    => array( '0', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Trinidad and Tobago',
				'alphacode'   => 'tt',
				'countryCode' => '+1868',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Tunisia (‫تونس‬‎)',
				'alphacode'   => 'tn',
				'countryCode' => '+216',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '2', '3', '4', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Turkey (Türkiye)',
				'alphacode'   => 'tr',
				'countryCode' => '+90',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3', '4', '5', '8', '9' ),
			),
			array(
				'name'        => 'Turkmenistan',
				'alphacode'   => 'tm',
				'countryCode' => '+993',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Turks and Caicos Islands',
				'alphacode'   => 'tc',
				'countryCode' => '+1649',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Tuvalu',
				'alphacode'   => 'tv',
				'countryCode' => '+688',
				'minLength'   => 5,
				'maxLength'   => 5,
				'prefixes'    => array( '2', '7', '9' ),
			),
			array(
				'name'        => 'U.S. Virgin Islands',
				'alphacode'   => 'vi',
				'countryCode' => '+1340',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Uganda',
				'alphacode'   => 'ug',
				'countryCode' => '+256',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '7', '8', '9' ),
			),
			array(
				'name'        => 'Ukraine (Україна)',
				'alphacode'   => 'ua',
				'countryCode' => '+380',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'United Arab Emirates (‫الإمارات العربية المتحدة‬‎)',
				'alphacode'   => 'ae',
				'countryCode' => '+971',
				'minLength'   => 8,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'United Kingdom',
				'alphacode'   => 'gb',
				'countryCode' => '+44',
				'minLength'   => 10,
				'maxLength'   => 11,
				'prefixes'    => array( '1', '2', '3', '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'United States',
				'alphacode'   => 'us',
				'countryCode' => '+1',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Uruguay',
				'alphacode'   => 'uy',
				'countryCode' => '+598',
				'minLength'   => 8,
				'maxLength'   => 8,
				'prefixes'    => array( '0', '1', '2', '4', '8', '9' ),
			),
			array(
				'name'        => 'Uzbekistan (Oʻzbekiston)',
				'alphacode'   => 'uz',
				'countryCode' => '+998',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '2', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Vanuatu',
				'alphacode'   => 'vu',
				'countryCode' => '+678',
				'minLength'   => 5,
				'maxLength'   => 7,
				'prefixes'    => array( '5', '7', '8', '9' ),
			),
			array(
				'name'        => 'Vatican City (Città del Vaticano)',
				'alphacode'   => 'va',
				'countryCode' => '+39',
				'minLength'   => 9,
				'maxLength'   => 11,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Venezuela',
				'alphacode'   => 've',
				'countryCode' => '+58',
				'minLength'   => 10,
				'maxLength'   => 10,
				'prefixes'    => array( '2', '4', '5', '6', '8', '9' ),
			),
			array(
				'name'        => 'Vietnam (Việt Nam)',
				'alphacode'   => 'vn',
				'countryCode' => '+84',
				'minLength'   => 9,
				'maxLength'   => 10,
				'prefixes'    => array( '1', '2', '3', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Wallis and Futuna (Wallis-et-Futuna)',
				'alphacode'   => 'wf',
				'countryCode' => '+681',
				'minLength'   => 6,
				'maxLength'   => 6,
				'prefixes'    => array( '4', '7', '8', '9' ),
			),
			array(
				'name'        => 'Western Sahara (‫الصحراء الغربية‬‎)',
				'alphacode'   => 'eh',
				'countryCode' => '+212',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '5', '6', '7', '8' ),
			),
			array(
				'name'        => 'Yemen (‫اليمن‬‎)',
				'alphacode'   => 'ye',
				'countryCode' => '+967',
				'minLength'   => 7,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7' ),
			),
			array(
				'name'        => 'Zambia',
				'alphacode'   => 'zm',
				'countryCode' => '+260',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Zimbabwe',
				'alphacode'   => 'zw',
				'countryCode' => '+263',
				'minLength'   => 9,
				'maxLength'   => 9,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
			array(
				'name'        => 'Åland Islands',
				'alphacode'   => 'ax',
				'countryCode' => '+358',
				'minLength'   => 5,
				'maxLength'   => 12,
				'prefixes'    => array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ),
			),
		);

		/**
		 * Returns list of countries with their details.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @return array Array of country details.
		 */
		public static function get_countrycode_list() {
			return self::$countries;
		}


		/**
		 * Returns default country code (Deprecated).
		 *
		 * @since 1.0.0
		 * @access public
		 * @deprecated 2.0.0 Use get_default_countrycode() instead.
		 *
		 * @return string|null Default country code if set, null otherwise.
		 */
		public static function get_default_countrycode_deprecated() {
			return ! MoUtility::is_blank( get_mo_option( 'default_country_code' ) )
					? sanitize_text_field( get_mo_option( 'default_country_code' ) ) : null;
		}


		/**
		 * Checks if country is selected (Deprecated).
		 *
		 * @since 1.0.0
		 * @access public
		 * @deprecated 2.0.0 Use is_country_selected() instead.
		 *
		 * @param string $value The value of the default country code.
		 * @return bool True if country is selected, false otherwise.
		 */
		public static function is_country_selected_deprecated( $value ) {
			$value = sanitize_text_field( $value );
			return ! MoUtility::is_blank( get_mo_option( 'default_country_code' ) )
					&& get_mo_option( 'default_country_code' ) === $value;
		}


		/**
		 * Returns default country data.
		 *
		 * @since 2.0.0
		 * @access public
		 *
		 * @return array|null Default country data if set, null otherwise.
		 */
		public static function get_default_country_data() {
			return ! MoUtility::is_blank( get_mo_option( 'default_country' ) )
					? maybe_unserialize( get_mo_option( 'default_country' ) ) : null;
		}

		/**
		 * Returns default country code data.
		 *
		 * @since 2.0.0
		 * @access public
		 *
		 * @return string|null Default country code if set, null otherwise.
		 */
		public static function get_default_countrycode() {
			$old_value = self::get_default_countrycode_deprecated();
			$new_value = self::get_default_country_data();

			if ( ! MoUtility::is_blank( $old_value ) ) {
				return $old_value;
			} elseif ( is_array( $new_value ) && ! MoUtility::is_blank( $new_value ) && isset( $new_value['countryCode'] ) ) {
				return sanitize_text_field( wp_unslash( $new_value['countryCode'] ) );
			}
			return null;
		}


		/**
		 * Checks if country is selected.
		 *
		 * @since 2.0.0
		 * @access public
		 *
		 * @param string $value     The value of the default country code.
		 * @param string $alphacode The alphacode value of the country code selected.
		 * @return bool True if country is selected, false otherwise.
		 */
		public static function is_country_selected( $value, $alphacode ) {
			$value     = sanitize_text_field( wp_unslash( $value ) );
			$alphacode = sanitize_text_field( wp_unslash( $alphacode ) );

			$old_value = self::is_country_selected_deprecated( $value );
			$new_value = self::get_default_country_data();

			if ( $old_value ) {
				return true;
			}

			if ( is_array( $new_value ) && isset( $new_value['alphacode'] ) && ! MoUtility::is_blank( $new_value['alphacode'] ) ) {
				return sanitize_text_field( wp_unslash( $new_value['alphacode'] ) ) === $alphacode;
			}
			return false;
		}


		/**
		 * Returns default country ISO code.
		 *
		 * @since 2.0.0
		 * @access public
		 *
		 * @return string Default country ISO code if found, empty string otherwise.
		 */
		public static function get_default_country_iso_code() {
			$old_value = self::get_default_countrycode_deprecated();
			$new_value = self::get_default_country_data();

			if ( ! MoUtility::is_blank( $new_value ) && isset( $new_value['alphacode'] ) ) {
				return sanitize_text_field( wp_unslash( $new_value['alphacode'] ) );
			}

			if ( ! MoUtility::is_blank( $old_value ) ) {
				foreach ( self::$countries as $country ) {
					if ( isset( $country['countryCode'] ) && $old_value === $country['countryCode'] ) {
						return sanitize_text_field( $country['alphacode'] );
					}
				}
			}
			return '';
		}


		/**
		 * Function for selected countries.
		 * Used in premium addon.
		 *
		 * @since 2.0.0
		 * @access public
		 * @deprecated 3.0.0 This function may be removed in a future version.
		 *
		 * @return null This function currently returns null.
		 */
		public static function get_only_country_list() {
			$country_val    = array();
			$countriesavail = self::get_countrycode_list();
			$countriesavail = apply_filters( 'selected_countries', $countriesavail );
			foreach ( $countriesavail as $key => $value ) {
				array_push( $country_val, $value );
			}
			return $country_val;
		}
	}
}
