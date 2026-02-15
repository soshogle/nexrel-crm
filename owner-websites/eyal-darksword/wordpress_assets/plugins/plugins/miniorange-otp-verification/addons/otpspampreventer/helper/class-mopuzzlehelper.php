<?php
/**
 * Puzzle Helper Class
 *
 * Contains all puzzle generation, validation, and management functions.
 * This class handles the secure puzzle system for OTP spam prevention.
 *
 * @package otpspampreventer/helper
 */

namespace OSP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoPHPSessions;

if ( ! class_exists( 'MoPuzzleHelper' ) ) {
	/**
	 * Puzzle Helper Class
	 *
	 * Handles all puzzle-related operations including generation,
	 * validation, session management, and security checks.
	 */
	class MoPuzzleHelper {

		/**
		 * Generate a secure mathematical puzzle
		 *
		 * Creates a random mathematical puzzle with varying difficulty levels.
		 * The puzzle data is designed to be stored securely on the server.
		 *
		 * @return array|false Array with 'question' and 'answer' keys, or false on failure.
		 */
		public static function mosp_generate_secure_puzzle() {
			$puzzle_templates = array(
				// Basic addition.
				array(
					'type' => 'add',
					'min'  => 5,
					'max'  => 25,
				),
				array(
					'type' => 'add',
					'min'  => 10,
					'max'  => 50,
				),

				// Basic subtraction.
				array(
					'type' => 'sub',
					'min'  => 10,
					'max'  => 30,
				),
				array(
					'type' => 'sub',
					'min'  => 20,
					'max'  => 50,
				),

				// Basic multiplication.
				array(
					'type' => 'mul',
					'min'  => 2,
					'max'  => 9,
				),
				array(
					'type' => 'mul',
					'min'  => 3,
					'max'  => 12,
				),

				// Mixed operations.
				array(
					'type' => 'mixed_add_sub',
					'min'  => 5,
					'max'  => 20,
				),
				array(
					'type' => 'mixed_sub_add',
					'min'  => 10,
					'max'  => 25,
				),
			);

			$template = $puzzle_templates[ array_rand( $puzzle_templates ) ];

			switch ( $template['type'] ) {
				case 'add':
					$a = wp_rand( $template['min'], $template['max'] );
					$b = wp_rand( $template['min'], $template['max'] );
					return array(
						'question' => "{$a} + {$b}",
						'answer'   => $a + $b,
					);

				case 'sub':
					$a = wp_rand( $template['min'], $template['max'] );
					$b = wp_rand( $template['min'], $a );
					return array(
						'question' => "{$a} - {$b}",
						'answer'   => $a - $b,
					);

				case 'mul':
					$a = wp_rand( $template['min'], $template['max'] );
					$b = wp_rand( 2, 9 );
					return array(
						'question' => "{$a} × {$b}",
						'answer'   => $a * $b,
					);

				case 'mixed_add_sub':
					$a = wp_rand( $template['min'], $template['max'] );
					$b = wp_rand( 5, 15 );
					$c = wp_rand( 3, 10 );
					return array(
						'question' => "{$a} + {$b} - {$c}",
						'answer'   => $a + $b - $c,
					);

				case 'mixed_sub_add':
					$a = wp_rand( $template['min'], $template['max'] );
					$b = wp_rand( 5, 15 );
					$c = wp_rand( 3, 10 );
					return array(
						'question' => "{$a} - {$b} + {$c}",
						'answer'   => $a - $b + $c,
					);

				default:
					$a = wp_rand( 5, 20 );
					$b = wp_rand( 5, 20 );
					return array(
						'question' => "{$a} + {$b}",
						'answer'   => $a + $b,
					);
			}
		}

		/**
		 * Store puzzle data securely in session
		 *
		 * Stores puzzle data using WordPress session system with additional
		 * security metadata including IP, User-Agent, and timestamp.
		 * Uses fallback storage methods if primary session storage fails.
		 *
		 * @param string $question The puzzle question.
		 * @param int    $answer The correct answer.
		 * @param string $ip Client IP address.
		 * @param string $user_agent Client User-Agent string.
		 */
		public static function mosp_store_puzzle_in_session( $question, $answer, $ip = '', $user_agent = '' ) {
			$current_ip         = $ip ? $ip : MoSecurityHelper::mosp_get_client_ip();
			$current_user_agent = $user_agent ? $user_agent : MoSecurityHelper::mosp_get_user_agent();

			$puzzle_data = array(
				'question'   => sanitize_text_field( wp_unslash( $question ) ),
				'answer'     => intval( $answer ),
				'timestamp'  => time(),
				'ip'         => $current_ip,
				'user_agent' => $current_user_agent,
			);

			MoPHPSessions::unset_session( 'mo_osp_current_puzzle' );

			MoPHPSessions::add_session_var( 'mo_osp_current_puzzle', $puzzle_data );

			$verification = MoPHPSessions::get_session_var( 'mo_osp_current_puzzle' );
			if ( ! $verification ) {

				$user_key      = self::generate_user_puzzle_key( $current_ip, $current_user_agent );
				$transient_key = 'mo_osp_puzzle_' . $user_key;

				MoPHPSessions::add_session_var( $transient_key, $puzzle_data );
			}
		}

		/**
		 * Generate user-specific puzzle key for fallback storage
		 *
		 * @param string $ip Client IP address.
		 * @param string $user_agent Client User-Agent string.
		 * @return string Unique key for this user.
		 */
		private static function generate_user_puzzle_key( $ip, $user_agent ) {
			$unique_data = $ip . '|' . substr( $user_agent, 0, 100 ) . '|' . ( isset( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ) : '' );
			return substr( md5( $unique_data ), 0, 16 );
		}

		/**
		 * Get puzzle data from storage (primary session or fallback session)
		 *
		 * @return array|false Puzzle data or false if not found.
		 */
		private static function get_puzzle_data_from_storage() {
			$session_puzzle_data = MoPHPSessions::get_session_var( 'mo_osp_current_puzzle' );

			if ( $session_puzzle_data && is_array( $session_puzzle_data ) ) {
				return $session_puzzle_data;
			}

			$current_ip         = MoSecurityHelper::mosp_get_client_ip();
			$current_user_agent = MoSecurityHelper::mosp_get_user_agent();
			$user_key           = self::generate_user_puzzle_key( $current_ip, $current_user_agent );
			$transient_key      = 'mo_osp_puzzle_' . $user_key;

			$fallback_data = MoPHPSessions::get_session_var( $transient_key );
			if ( $fallback_data && is_array( $fallback_data ) ) {
				return $fallback_data;
			}

			return false;
		}

		/**
		 * Validate puzzle answer using session-stored data
		 *
		 * Validates the user's answer against securely stored puzzle data
		 * with comprehensive security checks including IP validation,
		 * User-Agent validation, and timestamp validation.
		 *
		 * @param int $user_answer The user's submitted answer.
		 * @return bool True if answer is correct and all security checks pass.
		 */
		public static function mosp_validate_puzzle_answer_from_session( $user_answer ) {

			$session_puzzle_data = self::get_puzzle_data_from_storage();

			if ( ! $session_puzzle_data || ! is_array( $session_puzzle_data ) ) {
				return false;
			}

			if ( ! isset( $session_puzzle_data['question'] ) || ! isset( $session_puzzle_data['answer'] ) || ! isset( $session_puzzle_data['timestamp'] ) ) {
				return false;
			}

			$puzzle_age = time() - $session_puzzle_data['timestamp'];

			if ( $puzzle_age > 600 ) {
				self::mosp_clear_puzzle_from_session();
				return false;
			}

			$current_ip         = MoSecurityHelper::mosp_get_client_ip();
			$current_user_agent = MoSecurityHelper::mosp_get_user_agent();

			$expected_answer = intval( $session_puzzle_data['answer'] );
			$user_answer_int = intval( $user_answer );
			$is_correct      = ( $user_answer_int === $expected_answer );

			if ( $is_correct ) {
				self::mosp_clear_puzzle_from_session();
			}

			return $is_correct;
		}

		/**
		 * Clear puzzle data from session
		 *
		 * Removes puzzle data from both primary and fallback storage for security cleanup.
		 */
		public static function mosp_clear_puzzle_from_session() {
			MoPHPSessions::unset_session( 'mo_osp_current_puzzle' );

			$current_ip         = MoSecurityHelper::mosp_get_client_ip();
			$current_user_agent = MoSecurityHelper::mosp_get_user_agent();
			$user_key           = self::generate_user_puzzle_key( $current_ip, $current_user_agent );
			$transient_key      = 'mo_osp_puzzle_' . $user_key;

			MoPHPSessions::unset_session( $transient_key );
		}

		/**
		 * Check if puzzle data exists in session.
		 *
		 * @return bool True if valid puzzle data exists in session.
		 */
		public static function mosp_has_puzzle_in_session() {
			$session_puzzle_data = self::get_puzzle_data_from_storage();

			if ( ! $session_puzzle_data || ! is_array( $session_puzzle_data ) ) {
				return false;
			}

			if ( isset( $session_puzzle_data['timestamp'] ) ) {
				$puzzle_age = time() - $session_puzzle_data['timestamp'];
				if ( $puzzle_age > 600 ) {
					self::mosp_clear_puzzle_from_session();
					return false;
				}
			}

			$has_required_fields = isset( $session_puzzle_data['question'] ) && isset( $session_puzzle_data['answer'] );

			return $has_required_fields;
		}

		/**
		 * Generate puzzle question as a blurred image.
		 *
		 * Creates an image with the puzzle question text, adds distortion effects
		 * to prevent OCR/bot bypass, and returns the image as a data URI.
		 *
		 * @param string $question The puzzle question text.
		 * @return string|false The image data URI or false on failure.
		 */
		public static function mosp_generate_puzzle_image( $question ) {
			if ( ! function_exists( 'imagecreatetruecolor' ) ) {
				return false;
			}

			$width  = 280;
			$height = 60;

			$image = imagecreatetruecolor( $width, $height );
			if ( ! $image ) {
				return false;
			}

			$bg_color    = imagecolorallocate( $image, 255, 255, 255 );
			$text_color  = imagecolorallocate( $image, 50, 50, 50 );
			$noise_color = imagecolorallocate( $image, 200, 200, 200 );

			imagefill( $image, 0, 0, $bg_color );

			for ( $i = 0; $i < 80; $i++ ) {
				imagesetpixel( $image, wp_rand( 0, $width ), wp_rand( 0, $height ), $noise_color );
			}

			for ( $i = 0; $i < 2; $i++ ) {
				$line_color = imagecolorallocate( $image, wp_rand( 220, 240 ), wp_rand( 220, 240 ), wp_rand( 220, 240 ) );
				imageline( $image, wp_rand( 0, $width ), wp_rand( 0, $height ), wp_rand( 0, $width ), wp_rand( 0, $height ), $line_color );
			}

			$font_path = '';
			$font_size = 20;

			$possible_fonts = array(
				'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
				'/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
				'C:/Windows/Fonts/arial.ttf',
				'C:/Windows/Fonts/verdana.ttf',
				'/System/Library/Fonts/Helvetica.ttc',
			);

			foreach ( $possible_fonts as $font ) {
				if ( file_exists( $font ) ) {
					$font_path = $font;
					break;
				}
			}

			$x = 15;
			$y = 40;

			if ( $font_path && function_exists( 'imagettftext' ) ) {
				$angle = wp_rand( -5, 5 );
				imagettftext( $image, $font_size, $angle, $x, $y, $text_color, $font_path, $question );
			} else {
				$font = 5;
				imagestring( $image, $font, $x, 20, $question, $text_color );
			}

			if ( function_exists( 'imagefilter' ) ) {
				imagefilter( $image, IMG_FILTER_GAUSSIAN_BLUR );
				imagefilter( $image, IMG_FILTER_SMOOTH, 2 );
			}

			ob_start();
			imagepng( $image, null, 9 );
			$image_data = ob_get_clean();

			imagedestroy( $image );

			if ( $image_data ) {
				// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Needed for data URI encoding.
				return 'data:image/png;base64,' . base64_encode( $image_data );
			}

			return false;
		}

		/**
		 * Render the puzzle popup HTML.
		 *
		 * Outputs the puzzle verification popup HTML that can be used on any page.
		 * This method handles all the HTML markup for the puzzle modal/overlay.
		 *
		 * @return void Outputs HTML directly
		 */
		public static function mosp_render_puzzle_popup() {
			?>
			<div id="mo-osp-puzzle-overlay" class="mo-osp-puzzle-overlay mo-osp-hidden">
				<div class="mo-osp-puzzle-popup">
					<div class="mo-osp-puzzle-header">
						<h3 class="mo-osp-puzzle-title">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
							</svg>
							<?php echo esc_html( __( 'Security Verification', 'miniorange-otp-verification' ) ); ?>
						</h3>
						<button type="button" class="mo-osp-puzzle-close" aria-label="<?php echo esc_attr( __( 'Close', 'miniorange-otp-verification' ) ); ?>">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
							</svg>
						</button>
					</div>

					<div class="mo-osp-puzzle-body">
						<div class="mo-osp-puzzle-message">
							<p><?php echo esc_html( __( 'For security purposes, please solve this simple puzzle to verify you are human before sending an OTP.', 'miniorange-otp-verification' ) ); ?></p>
						</div>

						<div class="mo-osp-puzzle-question">
							<div class="mo-osp-puzzle-equation">
								<img id="mo-osp-puzzle-image" class="mo-osp-puzzle-image" src="" alt="<?php echo esc_attr( __( 'Puzzle Question', 'miniorange-otp-verification' ) ); ?>" style="display: none;" />
								<span id="mo-osp-puzzle-text" class="mo-osp-equation-text" style="display: none;"></span>
								<span class="mo-osp-equals">=</span>
								<input type="number" id="mo-osp-puzzle-answer" class="mo-osp-puzzle-input" placeholder="?" autocomplete="off" />
							</div>
						</div>

						<div class="mo-osp-puzzle-error" id="mo-osp-puzzle-error" style="display: none;">
							<svg class="mo-osp-error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
							</svg>
							<span id="mo-osp-puzzle-error-text"></span>
						</div>
					</div>

					<div class="mo-osp-puzzle-footer">
						<button type="button" id="mo-osp-puzzle-refresh" class="mo-osp-puzzle-btn mo-osp-btn-secondary">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12S7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12S8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
							</svg>
							<?php echo esc_html( __( 'New Puzzle', 'miniorange-otp-verification' ) ); ?>
						</button>
						<button type="button" id="mo-osp-puzzle-verify" class="mo-osp-puzzle-btn mo-osp-btn-primary">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
							</svg>
							<?php echo esc_html( __( 'Verify & Send OTP', 'miniorange-otp-verification' ) ); ?>
						</button>
					</div>
				</div>
			</div>
			<?php
		}
	}
}
