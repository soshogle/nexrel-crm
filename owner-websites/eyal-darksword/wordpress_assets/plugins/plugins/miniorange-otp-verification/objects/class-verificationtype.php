<?php
/**Load Class VerificationType
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'VerificationType' ) ) {
	/**
	 * VerificationType class
	 *
	 * Class for defining verification types used in the plugin.
	 * This class contains constants that represent different methods
	 * of OTP verification including email, phone, both, external,
	 * test, and WhatsApp verification types.
	 */
	class VerificationType {

		/**
		 * Email verification type
		 *
		 * @var string
		 */
		const EMAIL = 'email';

		/**
		 * Phone verification type
		 *
		 * @var string
		 */
		const PHONE = 'phone';

		/**
		 * Both email and phone verification type
		 *
		 * @var string
		 */
		const BOTH = 'both';

		/**
		 * External verification type
		 *
		 * @var string
		 */
		const EXTERNAL = 'external';

		/**
		 * Test verification type
		 *
		 * @var string
		 */
		const TEST = 'test';

		/**
		 * WhatsApp verification type
		 *
		 * @var string
		 */
		const WHATSAPP = 'whatsapp';
	}
}
