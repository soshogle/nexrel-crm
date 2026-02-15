<?php
/**
 * OTP Spam Integration Handler.
 *
 * @package otpspampreventer/handler
 */

namespace OSP\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OSP\Traits\Instance;
use OSP\Handler\MoOtpSpamStorage;
use OSP\Handler\MoOtpSpamPreventerHandler;
use OSP\Helper\MoSecurityHelper;
use OSP\Helper\MoPuzzleHelper;
use OTP\Helper\FormList;
use OTP\Helper\MoPHPSessions;
use OTP\Helper\MoMessages;

if ( ! class_exists( 'MoOtpSpamIntegration' ) ) {
	/**
	 * Integrates spam prevention with the main OTP plugin
	 */
	class MoOtpSpamIntegration {

		use Instance;

		/**
		 * Storage handler
		 *
		 * @var MoOtpSpamStorage
		 */
		private $storage;

		/**
		 * Spam prevention handler
		 *
		 * @var MoOtpSpamPreventerHandler
		 */
		private $handler;

		/**
		 * Flag to track if hooks are initialized
		 *
		 * @var bool
		 */
		private $hooks_initialized = false;

		/**
		 * Initialize the integration
		 */
		protected function __construct() {
			$this->storage = MoOtpSpamStorage::instance();
			$this->handler = MoOtpSpamPreventerHandler::instance();

			$this->init_essential_hooks();

			add_action( 'wp_enqueue_scripts', array( $this, 'mosp_enqueue_frontend_scripts' ) );

			add_action( 'admin_enqueue_scripts', array( $this, 'mosp_enqueue_admin_scripts' ) );

			add_action( 'wp_footer', array( $this, 'mosp_add_puzzle_popup_to_frontend' ) );
		}

		/**
		 * Initialize essential hooks that don't require database access
		 */
		private function init_essential_hooks() {
			add_filter( 'mo_osp_get_cooldown_time', array( $this, 'mosp_filter_get_cooldown_time' ), 10, 1 );

			add_action( 'mo_osp_mosp_check_spam_before_otp_send', array( $this, 'mosp_check_spam_before_otp_send' ), 1, 5 );

			add_action( 'mo_generate_or_resend_otp', array( $this, 'mosp_check_spam_before_otp_send' ), 1, 5 );

			add_action( 'mo_include_js', array( $this, 'mosp_include_timer_js' ) );
		}

		/**
		 * Check for spam before OTP is sent (CENTRALIZED RATE LIMITING).
		 *
		 * This method is called by FormActionHandler::handleOTPAction via mo_osp_mosp_check_spam_before_otp_send action.
		 * It's called BEFORE OTP is sent, alongside ResendControl checks, in ONE central location.
		 * This ensures ALL spam prevention (rate limits, puzzles, cooldowns) is enforced consistently.
		 *
		 * @param string $user_login Username or identifier.
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 * @param string $otp_type Type of OTP (email/sms).
		 * @param string $from_both Whether both email and phone are enabled.
		 * @return void Exits early if blocked or puzzle required.
		 *
		 * @phpcs:disable WordPress.Security.NonceVerification.Missing -- Called from OTP generation hook, no nonce available
		 */
		public function mosp_check_spam_before_otp_send( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			if ( ! empty( $user_email ) ) {
				MoPHPSessions::add_session_var( 'user_email', $user_email );
			}
			if ( ! empty( $phone_number ) ) {
				MoPHPSessions::add_session_var( 'phone_number_mo', $phone_number );
			}

			static $attempt_recorded = false;
			$request_key             = $user_email . '|' . $phone_number . '|' . time();
			static $last_request_key = '';

			if ( $last_request_key === $request_key && $attempt_recorded ) {
				return;
			}

			$last_request_key = $request_key;

			$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';

			$puzzle_already_verified = MoSecurityHelper::mosp_is_puzzle_verification_valid( $user_email, $phone_number );

			if ( $puzzle_already_verified ) {
				$this->handler->mosp_record_attempt_for_identifiers( $user_email, $phone_number, $browser_id );
				$attempt_recorded = true;
				return;
			}

			$is_blocked = $this->handler->mosp_is_blocked( $user_email, $phone_number, $browser_id, 'otp_send' );

			$current_block_data           = $this->handler->mosp_get_block_data( $user_email, $phone_number, $browser_id, 'otp_send' );
			$current_block_remaining_time = $current_block_data['remaining_time'];
			$current_block_reason         = $current_block_data['reason'];

			$ip                = $this->handler->mosp_get_client_ip();
			$is_ip_whitelisted = false;
			if ( ! empty( $ip ) ) {
				$is_ip_whitelisted = $this->handler->mosp_is_whitelisted( $ip, 'ip' );

			}

			$would_be_blocked_reason         = '';
			$would_be_blocked_remaining_time = 0;

			if ( ! $is_blocked && $current_block_remaining_time <= 0 && ! $is_ip_whitelisted ) {
				$would_be_blocked_result = $this->handler->mosp_would_be_blocked_after_attempt_with_details( $user_email, $phone_number, $browser_id );
				if ( $would_be_blocked_result['would_be_blocked'] ) {
					$is_blocked                      = true;
					$would_be_blocked_reason         = $would_be_blocked_result['reason'];
					$would_be_blocked_remaining_time = $would_be_blocked_result['remaining_time'];

					$this->handler->mosp_store_block_for_identifiers( $user_email, $phone_number, $browser_id, $would_be_blocked_reason, $would_be_blocked_remaining_time );
				}
			} elseif ( ( $is_blocked || $current_block_remaining_time > 0 ) && ! $is_ip_whitelisted ) {
				$is_blocked                      = true;
				$would_be_blocked_reason         = $current_block_reason;
				$would_be_blocked_remaining_time = $current_block_remaining_time;
			} elseif ( $is_ip_whitelisted ) {
				$is_blocked                      = false;
				$would_be_blocked_reason         = '';
				$would_be_blocked_remaining_time = 0;
			}
			$requires_puzzle = false;

			if ( ! $is_blocked ) {

				$requires_puzzle = $this->handler->mosp_requires_puzzle_verification( $user_email, $phone_number, $this->handler->mosp_get_client_ip(), $browser_id );

				$requires_limit_puzzle = $this->handler->mosp_requires_limit_puzzle_verification( $user_email, $phone_number );

				$requires_puzzle = $requires_puzzle || $requires_limit_puzzle;
			}

			if ( $requires_puzzle ) {
				$is_ajax_form = apply_filters( 'is_ajax_form', false );

				if ( $is_ajax_form || 'ajax_phone' === $user_login ) {
					wp_send_json(
						array(
							'result'          => 'puzzle_required',
							'message'         => __( 'Please complete the security verification to continue.', 'miniorange-otp-verification' ),
							'puzzle_required' => true,
							'authType'        => 'PUZZLE_REQUIRED',
						)
					);
				} else {

					$puzzle_email = ! empty( $user_email ) ? $user_email : 'puzzle@temp.local';
					$puzzle_phone = ! empty( $phone_number ) ? $phone_number : null;

					miniorange_site_otp_validation_form( $user_login, $puzzle_email, $puzzle_phone, __( 'Please complete the security verification to continue.', 'miniorange-otp-verification' ), $otp_type, $from_both );
					exit;
				}
			} elseif ( ! $is_blocked ) {
				$this->handler->mosp_record_attempt_for_identifiers( $user_email, $phone_number, $browser_id );
				$attempt_recorded = true;

				$is_blocked_after_attempt = $this->handler->mosp_is_blocked( $user_email, $phone_number, $browser_id, 'otp_send' );
				if ( $is_blocked_after_attempt ) {
					$is_blocked = true;
				}
			}

			if ( $is_blocked ) {
				if ( $would_be_blocked_remaining_time > 0 ) {
					$remaining_time = $would_be_blocked_remaining_time;
					$block_reason   = $would_be_blocked_reason;
				} elseif ( $current_block_remaining_time > 0 ) {
					$remaining_time = $current_block_remaining_time;
					$block_reason   = $current_block_reason;
				} else {
					// Fallback: re-check block status right before displaying error (block may have expired since initial check).
					$block_data     = $this->handler->mosp_get_block_data( $user_email, $phone_number, $browser_id, 'otp_send' );
					$remaining_time = $block_data['remaining_time'];
					$block_reason   = $block_data['reason'];
				}

				if ( $would_be_blocked_remaining_time > 0 ) {
					$remaining_time = $would_be_blocked_remaining_time;
					$block_reason   = $would_be_blocked_reason;
				} elseif ( $remaining_time <= 0 ) {
					$requires_puzzle       = $this->handler->mosp_requires_puzzle_verification( $user_email, $phone_number, $this->handler->mosp_get_client_ip(), $browser_id );
					$requires_limit_puzzle = $this->handler->mosp_requires_limit_puzzle_verification( $user_email, $phone_number );
					$requires_puzzle       = $requires_puzzle || $requires_limit_puzzle;

					if ( ! $requires_puzzle && ! $attempt_recorded ) {
						$this->handler->mosp_record_attempt_for_identifiers( $user_email, $phone_number, $browser_id );
						$attempt_recorded = true;
						return;
					}
				}

				$message      = $this->handler->mosp_get_block_message_with_timer( $remaining_time );
				$is_ajax_form = apply_filters( 'is_ajax_form', false );

				if ( $is_ajax_form || 'ajax_phone' === $user_login ) {
						wp_send_json(
							array(
								'result'         => 'error',
								'message'        => $message,
								'blocked'        => true,
								'remaining_time' => $remaining_time,
								'blocked_type'   => $block_reason,
								'authType'       => 'BLOCKED',
								'status'         => 'BLOCKED',
							)
						);
					exit;
				} else {
					miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
					exit;
				}
			}
		}

		/**
		 * Enqueue frontend scripts.
		 *
		 * @return void
		 */
		public function mosp_enqueue_frontend_scripts() {
			if ( is_admin() ) {
				return;
			}

			if ( ! $this->is_otp_verification_active_on_page() ) {
				return;
			}

			$settings = $this->storage->mosp_get_settings();

			wp_enqueue_script(
				'mo-osp-frontend',
				MO_OSP_URL . 'includes/js/spam-preventer.js',
				array( 'jquery' ),
				'1.1.0',
				true
			);

			wp_enqueue_script(
				'mo-osp-puzzle-system',
				MO_OSP_URL . 'includes/js/puzzle-system.js',
				array( 'jquery', 'mo-osp-frontend' ),
				'1.0.0',
				true
			);

			wp_enqueue_style(
				'mo-osp-puzzle-css',
				MO_OSP_URL . 'includes/css/mo-admin.css',
				array(),
				'1.0.5'
			);

			wp_localize_script(
				'mo-osp-frontend',
				'mo_osp_ajax',
				array(
					'ajax_url'     => admin_url( 'admin-ajax.php' ),
					'nonce'        => wp_create_nonce( 'mo_osp_nonce' ),
					'loading_text' => __( 'Checking...', 'miniorange-otp-verification' ),
					'timer_time'   => $settings['cooldown_time'],
				)
			);
		}

		/**
		 * Enqueue admin scripts.
		 *
		 * @param string $hook_suffix Current admin page.
		 * @return void
		 */
		public function mosp_enqueue_admin_scripts( $hook_suffix ) {
			if ( strpos( $hook_suffix, 'mo_otp_verification' ) === false ) {
				return;
			}

			wp_enqueue_script(
				'mo-osp-admin',
				MO_OSP_URL . 'includes/js/spam-preventer-admin.js',
				array( 'jquery' ),
				'1.0.0',
				true
			);

			wp_localize_script(
				'mo-osp-admin',
				'mo_osp_admin_ajax',
				array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'mo_osp_admin_nonce' ),
				)
			);
		}

		/**
		 * Include timer JavaScript for pop-up forms.
		 * This is called via mo_include_js action when popup is rendered.
		 */
		public function mosp_include_timer_js() {
			$settings = $this->storage->mosp_get_settings();

			$email = MoPHPSessions::get_session_var( 'user_email' );
			$phone = MoPHPSessions::get_session_var( 'phone_number_mo' );
			// phpcs:disable WordPress.Security.NonceVerification.Missing
			$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';
			$ip                = $this->handler->mosp_get_client_ip();
			$is_ip_whitelisted = false;
			if ( ! empty( $ip ) ) {
				$is_ip_whitelisted = $this->handler->mosp_is_whitelisted( $ip, 'ip' );
			}

			$cooldown_remaining = $is_ip_whitelisted ? 0 : $this->mosp_get_cooldown_remaining_time( $email, $phone, $browser_id );
			$is_blocked         = $this->handler->mosp_is_blocked( $email, $phone, $browser_id, 'popup_render' );

			wp_register_style( 'mo-osp-puzzle-css-popup', MO_OSP_URL . 'includes/css/mo-admin.css', array(), '1.0.5', 'all' );
			wp_print_styles( 'mo-osp-puzzle-css-popup' );

			wp_register_script( 'mo-osp-timer', MO_OSP_URL . 'includes/js/spam-preventer.js', array( 'jquery' ), '1.0.0', false );
			wp_localize_script(
				'mo-osp-timer',
				'mo_osp_timer',
				array(
					'timer_time' => $settings['cooldown_time'],
				)
			);
			wp_print_scripts( 'mo-osp-timer' );

			wp_register_script( 'mo-osp-puzzle-system', MO_OSP_URL . 'includes/js/puzzle-system.js', array( 'jquery', 'mo-osp-timer' ), '1.0.0', false );
			wp_localize_script(
				'mo-osp-puzzle-system',
				'mo_osp_ajax',
				array(
					'ajax_url'    => admin_url( 'admin-ajax.php' ),
					'nonce'       => wp_create_nonce( 'mo_osp_nonce' ),
					'timer_time'  => $settings['cooldown_time'],
					'block_time'  => $settings['block_time'],
					'enable_logs' => defined( 'WP_DEBUG' ) && WP_DEBUG,
				)
			);
			wp_print_scripts( 'mo-osp-puzzle-system' );

			wp_register_script( 'mo-osp-popup-timer', MO_OSP_URL . 'includes/js/popup-timer.js', array( 'jquery', 'mo-osp-timer', 'mo-osp-puzzle-system' ), '1.0.0', false );
			wp_localize_script(
				'mo-osp-popup-timer',
				'mo_osp_popup_timer',
				array(
					'ajax_url'              => admin_url( 'admin-ajax.php' ),
					'nonce'                 => wp_create_nonce( 'mo_osp_nonce' ),
					'timer_time'            => $settings['cooldown_time'],
					'block_time'            => $settings['block_time'],
					'limit_otp_sent'        => MoMessages::showMessage( MoMessages::LIMIT_OTP_SENT ),
					'user_blocked'          => MoMessages::showMessage( MoMessages::USER_IS_BLOCKED_AJAX ),
					'error_otp_verify'      => MoMessages::showMessage( MoMessages::ERROR_OTP_VERIFY ),
					'initial_cooldown_time' => $cooldown_remaining,
					'initial_blocked'       => $is_blocked,
					'puzzle_required_text'  => __( 'Please complete the security verification to continue.', 'miniorange-otp-verification' ),
				)
			);
			wp_print_scripts( 'mo-osp-popup-timer' );

			echo '<div id="mo-osp-puzzle-popup-outer-div" style="display:none;">';
			MoPuzzleHelper::mosp_render_puzzle_popup();
			echo '</div>';
			$puzzle_message = __( 'Please complete the security verification to continue.', 'miniorange-otp-verification' );
			?>
			<script type="text/javascript">
			(function($) {
				'use strict';
				
				if (window.mo_osp_inline_puzzle_check_executed) {
					return;
				}
				window.mo_osp_inline_puzzle_check_executed = true;
				
				function checkAndShowPuzzle() {
					if (window.mo_osp_puzzle_shown) {
						return;
					}
					
					var $popupBody = $('.mo_customer_validation-modal-body');
					var $firstDiv = $popupBody.children('div').first();
					var messageText = '';
					
					if ($firstDiv.length > 0) {
						messageText = $firstDiv.text().trim();
					}
					if (!messageText && $popupBody.length > 0) {
						messageText = $popupBody.text().trim();
					}
					
					var puzzleText = '<?php echo esc_js( $puzzle_message ); ?>';
					
					if (messageText && messageText.toLowerCase().includes(puzzleText.toLowerCase())) {
						
						window.mo_osp_puzzle_shown = true;
						
						$('#mo_site_otp_form').hide();
						$('.mo_customer_validation-modal').hide();
						$('.mo-modal-backdrop').hide();
						
						if ($('#mo-osp-puzzle-overlay').length === 0) {
							return;
						}
						
						var $puzzleOverlay = $('#mo-osp-puzzle-overlay');
						$puzzleOverlay.css('z-index', '100001');
						
						$('#mo-osp-puzzle-popup-outer-div').show().css('z-index', '100002');
						$puzzleOverlay.removeClass('mo-osp-hidden');
						
						window.MO_OSP_Puzzle_onPopupSuccess = function() {
							if (typeof window.MO_OSP_Puzzle !== 'undefined' && window.MO_OSP_Puzzle.closePuzzle) {
								window.MO_OSP_Puzzle.closePuzzle();
							} else {
								jQuery('#mo-osp-puzzle-overlay').addClass('mo-osp-hidden');
								jQuery('#mo-osp-puzzle-popup-outer-div').hide();
							}
							
							var resendForm = document.getElementById('verification_resend_otp_form');
							if (resendForm) {
								if (!resendForm.querySelector('input[name="puzzle_verified"]')) {
									var puzzleVerifiedInput = document.createElement('input');
									puzzleVerifiedInput.type = 'hidden';
									puzzleVerifiedInput.name = 'puzzle_verified';
									puzzleVerifiedInput.value = 'true';
									resendForm.appendChild(puzzleVerifiedInput);
								}
								resendForm.submit();
							} else {
								sessionStorage.setItem('mo_osp_puzzle_completed', 'true');
								window.location.reload();
							}
						};
						
						if (typeof window.MO_OSP_Puzzle !== 'undefined') {
							if (typeof window.MO_OSP_Puzzle.init === 'function' && !window.MO_OSP_Puzzle.initialized) {
								window.MO_OSP_Puzzle.init();
								window.MO_OSP_Puzzle.initialized = true;
							}
							window.MO_OSP_Puzzle.showPuzzle({});
						} else {
							setTimeout(function() {
								if (typeof window.MO_OSP_Puzzle !== 'undefined') {
									if (typeof window.MO_OSP_Puzzle.init === 'function' && !window.MO_OSP_Puzzle.initialized) {
										window.MO_OSP_Puzzle.init();
										window.MO_OSP_Puzzle.initialized = true;
									}
									window.MO_OSP_Puzzle.showPuzzle({});
								} else {
									console.error('MO_OSP_Puzzle still not available after wait');
								}
							}, 500);
						}
					}
				}
				
				var checkExecuted = false;
				function runCheckOnce() {
					if (checkExecuted) {
						return;
					}
					checkExecuted = true;
					checkAndShowPuzzle();
				}
				
				if (document.readyState === 'loading') {
					$(document).ready(function() {
						setTimeout(runCheckOnce, 300);
					});
				} else {
					setTimeout(runCheckOnce, 300);
				}
			})(jQuery);
			</script>
			<?php
		}

		/**
		 * Add puzzle popup HTML to frontend.
		 */
		public function mosp_add_puzzle_popup_to_frontend() {
			if ( is_admin() ) {
				return;
			}

			if ( ! $this->is_otp_verification_active_on_page() ) {
				return;
			}

			echo '<div id="mo-osp-puzzle-popup-outer-div" style="display:none;">';
			MoPuzzleHelper::mosp_render_puzzle_popup();
			echo '</div>';
		}

		/**
		 * Check if OTP verification is active on the current page.
		 *
		 * @return bool True if any form has OTP verification enabled
		 */
		private function is_otp_verification_active_on_page() {
			$form_list = FormList::instance();
			$all_forms = $form_list->get_list();

			foreach ( $all_forms as $form_handler ) {
				if ( $form_handler && method_exists( $form_handler, 'is_form_enabled' ) ) {
					if ( $form_handler->is_form_enabled() ) {
						return true;
					}
				}
			}

			$otp_verification_options = array(
				'cf_submit_id',          
				'wc_default_enable',      
				'wp_default_enable',      
				'wp_login_enable',        
				'wc_checkout_enable',     
				'bp_registration_enable', 
				'um_default_enable',      
				'pmpro_default_enable',   
			);

			foreach ( $otp_verification_options as $option ) {
				if ( get_mo_option( $option ) ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Provide addon cooldown time to host plugin for server-side formatting.
		 *
		 * @param int $default Default fallback value.
		 * @return int seconds
		 */
		public function mosp_filter_get_cooldown_time( $default = 60 ) {
			$settings = $this->storage->mosp_get_settings();
			return isset( $settings['cooldown_time'] ) ? (int) $settings['cooldown_time'] : (int) $default;
		}

		/**
		 * Get remaining cooldown time for user.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser ID.
		 * @return int Remaining cooldown time in seconds.
		 */
		private function mosp_get_cooldown_remaining_time( $email, $phone, $browser_id ) {
			$identifiers   = $this->handler->mosp_get_all_identifiers( $email, $phone, $this->handler->mosp_get_client_ip(), $browser_id );
			$current_time  = time();
			$settings      = $this->storage->mosp_get_settings();
			$cooldown_time = $settings['cooldown_time'];

			foreach ( $identifiers as $identifier ) {
				$key  = $this->storage->mosp_hash_key( $identifier );
				$data = $this->storage->mosp_get_spam_data( $key );

				if ( false !== $data && isset( $data['last_attempt'] ) && $data['last_attempt'] > 0 ) {
					$time_since_last = $current_time - $data['last_attempt'];
					$remaining       = $cooldown_time - $time_since_last;

					if ( $remaining > 0 ) {
						return $remaining;
					}
				}
			}

			return 0;
		}
	}
}
