<?php
/**Load Interface FormSessionData
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'FormSessionData' ) ) {
	/**
	 * Interface class that needs to be extended by each form class.
	 * It defines some of the common actions and functions for each form
	 * class.
	 */
	class FormSessionData {
		/**
		 * Variable declaration
		 *
		 * @var bool
		 */
		private $is_initialized = false;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $email_submitted;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $phone_submitted;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $email_verified;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $phone_verified;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $email_verification_status;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $phone_verification_status;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $field_or_form_id;

		/**
		 * Variable declaration
		 *
		 * @var mixed
		 */
		private $user_submitted;

		/**
		 * Constructor
		 */
		public function __construct() {}

		/**
		 * MoInternal Function
		 *
		 * @return $this
		 */
		public function init() {
			$this->is_initialized = true;
			return $this;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_is_initialized() {
			return $this->is_initialized;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_email_submitted() {
			return $this->email_submitted;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $email_submitted email submission status.
		 */
		public function set_email_submitted( $email_submitted ) {
			$this->email_submitted = $email_submitted;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_phone_submitted() {
			return $this->phone_submitted;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $phone_submitted phone submission status.
		 */
		public function set_phone_submitted( $phone_submitted ) {
			$this->phone_submitted = $phone_submitted;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_email_verified() {
			return $this->email_verified;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $email_verified email status.
		 */
		public function set_email_verified( $email_verified ) {
			$this->email_verified = $email_verified;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_phone_verified() {
			return $this->phone_verified;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $phone_verified phone status.
		 */
		public function set_phone_verified( $phone_verified ) {
			$this->phone_verified = $phone_verified;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_email_verification_status() {
			return $this->email_verification_status;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $email_verification_status email status.
		 */
		public function set_email_verification_status( $email_verification_status ) {
			$this->email_verification_status = $email_verification_status;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_phone_verification_status() {
			return $this->phone_verification_status;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $phone_verification_status status.
		 */
		public function set_phone_verification_status( $phone_verification_status ) {
			$this->phone_verification_status = $phone_verification_status;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_field_or_form_id() {
			return $this->field_or_form_id;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $field_or_form_id id.
		 */
		public function set_field_or_form_id( $field_or_form_id ) {
			$this->field_or_form_id = $field_or_form_id;
		}

		/**
		 * MoInternal Function
		 *
		 * @return mixed
		 */
		public function get_user_submitted() {
			return $this->user_submitted;
		}

		/**
		 * MoInternal Function
		 *
		 * @param mixed $user_submitted user details.
		 */
		public function set_user_submitted( $user_submitted ) {
			$this->user_submitted = $user_submitted;
		}
	}
}
