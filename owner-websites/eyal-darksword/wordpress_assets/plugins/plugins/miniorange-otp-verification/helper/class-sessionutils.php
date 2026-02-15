<?php
/**
 * Load administrator changes for SessionUtils
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\FormSessionData;
use OTP\Objects\TransactionSessionData;
use OTP\Objects\VerificationType;

/**
 * This is the Session class for forms to handle all OTP session related functions
 */
if ( ! class_exists( 'SessionUtils' ) ) {
	/**
	 * SessionUtils class
	 */
	final class SessionUtils {


		/**
		 * Function to check if OTP is initialized
		 *
		 * @param string $key form key.
		 * @return bool|mixed
		 */
		public static function is_otp_initialized( $key ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $form_data->get_is_initialized();
			}
			return false;
		}

		/**
		 * Function to add if email or sms is verified
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @param string $otp_type SMS or Email.
		 * @return void
		 */
		public static function add_email_or_phone_verified( $key, $val, $otp_type ) {
			switch ( $otp_type ) {
				case VerificationType::PHONE:
					self::add_phone_verified( $key, $val );
					break;
				case VerificationType::EMAIL:
					self::add_email_verified( $key, $val );
					break;
			}
		}

		/**
		 * Function to add the email submitted by user
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function add_email_submitted( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_email_submitted( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}
		/**
		 * Function to add the phone submitted by user
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function add_phone_submitted( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_phone_submitted( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}
		/**
		 * Function to add the email verified by user
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function add_email_verified( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_email_verified( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}
		/**
		 * Function to add the phone verified by user
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function add_phone_verified( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_phone_verified( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}

		/**
		 * Function to add the status of form
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @param string $type EMAIL or SMS.
		 * @return void
		 */
		public static function add_status( $key, $val, $type ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				if ( ! $form_data->get_is_initialized() ) {
					return;
				}
				if ( VerificationType::EMAIL === $type ) {
					$form_data->set_email_verification_status( $val );
				}
				if ( VerificationType::PHONE === $type ) {
					$form_data->set_phone_verification_status( $val );
				}
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}

		/**
		 * Function to check if the status is matches for form
		 *
		 * @param string $key form key.
		 * @param string $status of verification type.
		 * @param string $type EMAIL or SMS.
		 * @return bool
		 */
		public static function is_status_match( $key, $status, $type ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				switch ( $type ) {
					case VerificationType::EMAIL:
						return $status === $form_data->get_email_verification_status();
					case VerificationType::PHONE:
						return $status === $form_data->get_phone_verification_status();
					case VerificationType::BOTH:
						return $status === $form_data->get_email_verification_status()
						|| $status === $form_data->get_phone_verification_status();
				}
			}
			return false;
		}
		/**
		 * Function to check if the email matches
		 *
		 * @param string $key form key.
		 * @param string $string_value email.
		 * @return bool
		 */
		public static function is_email_verified_match( $key, $string_value ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $string_value === $form_data->get_email_verified();
			}
			return false;
		}
		/**
		 * Function to check if the phone matches
		 *
		 * @param string $key form key.
		 * @param string $string_value phone.
		 * @return bool
		 */
		public static function is_phone_verified_match( $key, $string_value ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $string_value === $form_data->get_phone_verified();
			}
			return false;
		}
		/**
		 * Function to set transaction id of email
		 *
		 * @param string $tx_id transaction Id.
		 */
		public static function set_email_transaction_id( $tx_id ) {
			$transaction_data = MoPHPSessions::get_session_var( FormSessionVars::TX_SESSION_ID );
			if ( ! $transaction_data instanceof TransactionSessionData ) {
				$transaction_data = new TransactionSessionData();
			}
			$transaction_data->set_email_transaction_id( $tx_id );
			MoPHPSessions::add_session_var( FormSessionVars::TX_SESSION_ID, $transaction_data );
		}
		/**
		 * Function to set transaction id of email
		 *
		 * @param string $tx_id transaction Id.
		 */
		public static function set_phone_transaction_id( $tx_id ) {
			$transaction_data = MoPHPSessions::get_session_var( FormSessionVars::TX_SESSION_ID );
			if ( ! $transaction_data instanceof TransactionSessionData ) {
				$transaction_data = new TransactionSessionData();
			}
			$transaction_data->set_phone_transaction_id( $tx_id );
			MoPHPSessions::add_session_var( FormSessionVars::TX_SESSION_ID, $transaction_data );
		}

		/**
		 * Function to get transaction id of otp type
		 *
		 * @param string $otp_type   OTP Type to pick up the transaction ID for.
		 * @return string
		 */
		public static function get_transaction_id( $otp_type ) {
			$transaction_data = MoPHPSessions::get_session_var( FormSessionVars::TX_SESSION_ID );
			if ( $transaction_data instanceof TransactionSessionData ) {
				switch ( $otp_type ) {
					case VerificationType::EMAIL:
						return $transaction_data->get_email_transaction_id();
					case VerificationType::PHONE:
						return $transaction_data->get_phone_transaction_id();
					case VerificationType::WHATSAPP:
						return $transaction_data->get_phone_transaction_id();
					case VerificationType::BOTH:
						return MoUtility::is_blank( $transaction_data->get_phone_transaction_id() )
						? $transaction_data->get_email_transaction_id() : $transaction_data->get_phone_transaction_id();
				}
			}
			return '';
		}

		/**
		 * Function to unset session
		 *
		 * @param string $keys Key values of session.
		 * @return void
		 */
		public static function unset_session( $keys ) {
			$keys = is_array( $keys ) ? $keys : array( $keys );
			foreach ( $keys as $key ) {
				MoPHPSessions::unset_session( $key );
			}
		}
		/**
		 * Function to check if phone verified by the user and submitted at form submittion is same
		 *
		 * @param string $key key value of session.
		 * @return boolean
		 */
		public static function is_phone_submitted_and_verified_match( $key ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $form_data->get_phone_verified() === $form_data->get_phone_submitted();
			}
			return false;
		}
		/**
		 * Function to check if email verified by the user and submitted at form submittion is same
		 *
		 * @param string $key key value of session.
		 * @return boolean
		 */
		public static function is_email_submitted_and_verified_match( $key ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $form_data->get_email_verified() === $form_data->get_email_submitted();
			}
			return false;
		}
		/**
		 * Function to set the form or field ID in session
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function set_form_or_field_id( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_field_or_form_id( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}

		/**
		 * Function to get the form or field ID in session
		 *
		 * @param string $key key value of session.
		 * @return string
		 */
		public static function get_form_or_field_id( $key ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $form_data->get_field_or_form_id();
			}
			return '';
		}

		/**
		 * Function to initialize and add the form in session
		 *
		 * @param array $form form key value of session.
		 * @return void
		 */
		public static function initialize_form( $form ) {
			$form_data = new FormSessionData();
			MoPHPSessions::add_session_var( $form, $form_data->init() );
		}

		/**
		 * Function to add user in session
		 *
		 * @param string $key form key.
		 * @param string $val value of key.
		 * @return void
		 */
		public static function add_user_in_session( $key, $val ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				$form_data->set_user_submitted( $val );
				MoPHPSessions::add_session_var( $key, $form_data );
			}
		}
		/**
		 * Function to get the user in session
		 *
		 * @param string $key form key.
		 * @return string
		 */
		public static function get_user_submitted( $key ) {
			$form_data = MoPHPSessions::get_session_var( $key );
			if ( $form_data instanceof FormSessionData ) {
				return $form_data->get_user_submitted();
			}
			return '';
		}
	}
}
