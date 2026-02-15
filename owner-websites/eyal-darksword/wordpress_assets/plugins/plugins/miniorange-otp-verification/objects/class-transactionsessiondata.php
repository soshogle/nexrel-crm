<?php
/**Load Class TransactionSessionData
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'TransactionSessionData' ) ) {
	/**
	 * TransactionSessionData class
	 *
	 * This class is for transaction session data which defines some common
	 * functionality for all of our transaction details. It manages email and
	 * phone transaction IDs for OTP verification sessions.
	 */
	class TransactionSessionData {

		/**
		 * Email transaction ID variable
		 *
		 * @var string
		 */
		private $email_transaction_id;

		/**
		 * Phone transaction ID variable
		 *
		 * @var string
		 */
		private $phone_transaction_id;

		/**
		 * Get the email transaction ID
		 *
		 * @return string
		 */
		public function get_email_transaction_id() {
			return $this->email_transaction_id;
		}

		/**
		 * Set the email transaction ID
		 *
		 * @param string $email_transaction_id email transaction id.
		 * @return void
		 */
		public function set_email_transaction_id( $email_transaction_id ) {
			$this->email_transaction_id = $email_transaction_id;
		}

		/**
		 * Get the phone transaction ID
		 *
		 * @return string
		 */
		public function get_phone_transaction_id() {
			return $this->phone_transaction_id;
		}

		/**
		 * Set the phone transaction ID
		 *
		 * @param string $phone_transaction_id phone transaction id.
		 * @return void
		 */
		public function set_phone_transaction_id( $phone_transaction_id ) {
			$this->phone_transaction_id = $phone_transaction_id;
		}
	}
}
