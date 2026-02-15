<?php
/**
 * Load adminstrator changes for FormList.
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\FormHandler;
use OTP\Traits\Instance;

/**
 * This class lists down all the forms supported by the plugin.
 */
if ( ! class_exists( 'FormList' ) ) {
	/**
	 * FormList class
	 */
	final class FormList {

		use Instance;

		/**
		 * Key value pair associative array. This holds all the
		 * form Object which is initialized.
		 *
		 * @var array
		 */
		private $forms;

		/**
		 * Key value pair associative array. This holds all the
		 * important forms Object which is initialized.
		 *
		 * @var array
		 */
		private $important_forms;

		/**
		 * Key Value pair associative array. This holds all the form
		 * Object which is active.
		 *
		 * @var array
		 */
		private $enabled_forms;

		/**
		 * Constructor
		 */
		private function __construct() {
			$this->forms           = array();
			$this->important_forms = array();
			$this->enabled_forms   = array();
		}

		/**
		 * Add Form to the FormList
		 *
		 * @param string      $key    the form key.
		 * @param FormHandler $form   the formHandler Object of the Form.
		 */
		public function add( $key, $form ) {
			$this->forms[ $key ] = $form;
			if ( $form->is_form_enabled() ) {
				$this->enabled_forms[ $key ] = $form;
			}
		}

		/*
		|---------------------------------------------------------------------------
		| Getters
		|---------------------------------------------------------------------------
		 */

		/**
		 * Function to return list
		 *
		 * @return array
		 */
		public function get_list() {
			return $this->forms;
		}

		/**
		 * Function to return list
		 *
		 * @return array
		 */
		public function get_important_forms_list() {
			$this->important_forms = array(
				'WP_DEFAULT_LOGIN',
				'WC_REG_FORM',
				'WC_CHECKOUT_FORM',
				'WC_NEW_CHECKOUT_FORM',
				'GRAVITY_FORM',
				'NINJA_FORM_AJAX',
				'CF7_FORM',
				'FORMINATOR',
				'WPFORMS',
				'ULTIMATE_FORM',
				'MO_LOGIN_REG_USING_PHONE_FORM',
			);
			return $this->important_forms;
		}


		/**
		 * Function to return list
		 *
		 * @return array
		 */
		public function get_enabled_forms() {
			return $this->enabled_forms;
		}
	}
}
