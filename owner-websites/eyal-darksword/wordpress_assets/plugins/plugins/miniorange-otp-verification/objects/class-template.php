<?php
/**Load Abstract Class Template
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

/**
 * This super class is the super class which defines some common
 * functionality for all of our html templates. This should
 * be extended by every template class that we make.
 *
 * @todo Add a reset template functionality
 */
if ( ! class_exists( 'Template' ) ) {
	/**
	 * Template class
	 */
	abstract class Template extends BaseActionHandler implements MoITemplate {

		/**
		 * The key for the template which will uniquely
		 * differentiate the template from other templates
		 *
		 * @var string
		 */
		protected $key;

		/**
		 * The template editor Id unique for each template
		 *
		 * @var string
		 */
		protected $template_editor_id;

		/**
		 * The nonce for the popup template form
		 *
		 * @var string
		 */
		protected $nonce;

		/**
		 * Is preview mode on or not
		 *
		 * @var bool
		 */
		protected $preview = false;

		/**
		 * The HTML skeleton for the jquery URL that can be used in any template
		 *
		 * @var string
		 */
		protected $jquery_url;

		/**
		 * The loader img HTML skeleton
		 *
		 * @var string
		 */
		protected $img;

		/**
		 * The common HTML code for the IFRAME so that the
		 * content is centered on the page
		 *
		 * @var string
		 */
		public $pane_content;

		/**
		 * The common HTML code for showing messages
		 * in the IFRAME
		 *
		 * @var string
		 */
		public $message_div;

		/**
		 * The common HTML code for showing success messages in the IFRAME
		 *
		 * @var string
		 */
		protected $success_message_div;

		/**
		 * Common settings for all the editors of the template.
		 *
		 * @var array
		 */
		public static $template_editor = array(
			'wpautop'           => false,
			'media_buttons'     => false,
			'textarea_rows'     => 20,
			'tabindex'          => '',
			'tabfocus_elements' => ':prev,:next',
			'editor_css'        => '',
			'editor_class'      => '',
			'teeny'             => false,
			'dfw'               => false,
			'tinymce'           => false,
			'quicktags'         => true,
		);

		/**
		 * The tags necessary to be present in the popup template.
		 * Can be overriden by base class for more tags
		 *
		 * @var array
		 */
		protected $required_tags = array(
			'{{JQUERY}}',
			'{{GO_BACK_ACTION_CALL}}',
			'{{FORM_ID}}',
			'{{REQUIRED_FIELDS}}',
			'{{REQUIRED_FORMS_SCRIPTS}}',
		);

		/**
		 * ----------------------------------------------------------------
		 * constructor
		 * ----------------------------------------------------------------
		 */
		protected function __construct() {
			parent::__construct();

			$this->jquery_url = '';

			$this->img = "<div style='display:table;text-align:center;'>" .
					"<img src='{{LOADER_CSV}}'>" .
					'</div>';

			$this->pane_content = "<div style='text-align:center;width: 100%;height: 450px;display: block;" .
										"margin-top: 20%;vertical-align: middle;'>" .
										'{{CONTENT}}' .
										'</div>';

			$this->message_div = "<div style='font-weight: 600;" .
										'font-family:Segoe UI,Helvetica Neue,sans-serif;' .
										"color:black;'>" .
									'{{MESSAGE}}' .
							'</div>';

			$this->success_message_div = "<div style='font-style: italic;font-weight: 600;color: #23282d;" .
										"font-family:Segoe UI,Helvetica Neue,sans-serif;color:#138a3d;'>" .
											'{{MESSAGE}}' .
								'</div>
								';

			$this->img   = str_replace( '{{LOADER_CSV}}', MOV_LOADER_URL, $this->img );
			$this->nonce = 'mo_popup_options';
			add_filter( 'mo_template_defaults', array( $this, 'get_defaults' ), 1, 1 );
			add_filter( 'mo_template_build', array( $this, 'build' ), 1, 5 );
			add_action( 'admin_post_mo_preview_popup', array( $this, 'show_preview' ) );
			add_action( 'admin_post_mo_popup_save', array( $this, 'save_popup' ) );
			add_action( 'admin_post_mo_popup_reset', array( $this, 'reset_popup' ) );
		}

		/**
		 * This function is used to preview the template based on the type passed
		 * to the filter. This function is called when the filter admin_post_mo_preview_popup
		 * filter is called. The filter can be used by other users to modify the
		 * template if they choose to do so.
		 *
		 * @return void
		 */
		public function show_preview() {
			if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'mo_popup_options' ) ) {
				wp_die( esc_attr( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
			}
			if ( isset( $_POST['popuptype'] ) && sanitize_text_field( wp_unslash( $_POST['popuptype'] ) ) !== $this->get_template_key() ) {
				return;
			}
			$data     = MoUtility::mo_sanitize_array( $_POST );
			$message  = '<i>' . __( 'PopUp Message shows up here.', 'miniorange-otp-verification' ) . '</i>';
			$otp_type = VerificationType::TEST;
			if ( ! isset( $_POST[ $this->get_template_editor_id() ] ) ) {
				return;
			}
			$template = wp_kses( wp_unslash( $_POST[ $this->get_template_editor_id() ] ), MoUtility::mo_allow_html_array() );
			$this->validateRequiredFields( $template );
			$from_both     = false;
			$this->preview = true;
			$preview_popup = $this->parse( $template, $message, $otp_type, $from_both );
			$preview_popup = preg_replace( '#<script\b[^>]*>.*?</script>#is', '', $preview_popup );
			$preview_popup = preg_replace( '#\son\w+\s*=\s*(["\']).*?\1#is', '', $preview_popup );
			$preview_popup = preg_replace( '#\s(?:href|src)\s*=\s*([\'"])\s*javascript:[^\'"]*\1#is', '', $preview_popup );
			wp_send_json(
				MoUtility::create_json(
					$preview_popup,
					MoConstants::SUCCESS_JSON_TYPE
				)
			);
		}

		/**
		 * This function is called to save the pop up in the database that the admin
		 * has set in the settings. Called using the admin_post_mo_popup_save action.
		 * The action can be used by other users to modify the template before it is
		 * saved in the database if they choose to do so.
		 *
		 * @return void
		 */
		public function save_popup() {
			if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'mo_popup_options' ) ) {
				wp_die( esc_attr( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
				return;
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			if ( ! $this->isTemplateType( $data ) ) {
				return;
			}
			if ( ! isset( $_POST[ $this->get_template_editor_id() ] ) ) {
				return;
			}
			$template = wp_kses( wp_unslash( $_POST[ $this->get_template_editor_id() ] ), MoUtility::mo_allow_html_array() );
			$this->validateRequiredFields( $template );
			$email_templates = maybe_unserialize( get_mo_option( 'custom_popups' ) );
			if ( ! is_array( $email_templates ) ) {
				$email_templates = array();
			}
			$email_templates[ $this->get_template_key() ] = $template;
			update_mo_option( 'custom_popups', $email_templates );
			wp_send_json(
				MoUtility::create_json(
					$this->showSuccessMessage( MoMessages::showMessage( MoMessages::TEMPLATE_SAVED ) ),
					MoConstants::SUCCESS_JSON_TYPE
				)
			);
		}

		/**
		 * This function is called to reset the pop up in the database.
		 * Called using the admin_post_mo_popup_reset action.
		 *
		 * @return void
		 */
		public function reset_popup() {
			if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'mo_popup_options' ) ) {
				wp_die( esc_attr( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
				return;
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			if ( ! $this->isTemplateType( $data ) ) {
				return;
			}
			if ( ! isset( $_POST[ $this->get_template_editor_id() ] ) ) {
				return;
			}
			$templates       = apply_filters( 'mo_template_defaults', array() );
			$popup_templates = maybe_unserialize( get_mo_option( 'custom_popups' ) );
			if ( ! is_array( $popup_templates ) ) {
				$popup_templates = array();
			}
			$key                   = $this->get_template_key();
			$template_for_response = isset( $templates[ $key ] ) ? $templates[ $key ] : '';
			if ( isset( $templates[ $key ] ) ) {
				$popup_templates[ $key ] = $templates[ $key ];
			}
			if ( $this->get_template_key() === 'DEFAULT' ) {
				update_mo_option( 'selected_popup', 'Default' );
			}
			update_mo_option( 'custom_popups', $popup_templates );
			wp_send_json(
				MoUtility::create_json(
					array(
						'message'  => $this->showSuccessMessage( MoMessages::showMessage( MoMessages::TEMPLATE_RESET ) ),
						'template' => $template_for_response,
					),
					MoConstants::SUCCESS_JSON_TYPE
				)
			);
		}

		/**
		 * This function is used to build the template based on the type passed
		 * to the filter. This function is called when the filter mo_template_build
		 * filter is called. The filter can be used by other users to modify the
		 * template if they choose to do so.
		 *
		 * @param string $template      the template content to be modified.
		 * @param string $template_type  the template type.
		 * @param string $message       the message to be show in the popup.
		 * @param string $otp_type      the otp type invoked.
		 * @param string $from_both     does user have the option to choose b/w email and sms verification.
		 * @return string
		 */
		public function build( $template, $template_type, $message, $otp_type, $from_both ) {
			if ( strcasecmp( $template_type, $this->get_template_key() ) !== 0 ) {
				return $template;
			}
			$email_templates = maybe_unserialize( get_mo_option( 'custom_popups' ) );
			if ( is_array( $email_templates ) && isset( $email_templates[ $this->get_template_key() ] ) ) {
				$template = $email_templates[ $this->get_template_key() ];
			}
			return $this->parse( $template, $message, $otp_type, $from_both );
		}

		/**
		 * This function checks if the template passed to it has the required
		 * tags necessary for the popup to work. If not then return false or
		 * return true.
		 *
		 * @param mixed $template template.
		 * @return void
		 */
		protected function validateRequiredFields( $template ) {
			foreach ( $this->required_tags as $tag ) {
				if ( strpos( $template, $tag ) === false ) {
					$message = str_replace(
						'{{MESSAGE}}',
						MoMessages::showMessage( MoMessages::REQUIRED_TAGS, array( 'TAG' => $tag ) ),
						$this->message_div
					);
					wp_send_json(
						MoUtility::create_json(
							str_replace( '{{CONTENT}}', $message, $this->pane_content ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			}
			if ( MoUtility::check_for_script_tags( $template ) ) {
				$message = str_replace(
					'{{MESSAGE}}',
					MoMessages::showMessage( MoMessages::INVALID_SCRIPTS ),
					$this->message_div
				);
				wp_send_json(
					MoUtility::create_json(
						str_replace( '{{CONTENT}}', $message, $this->pane_content ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * This function is used to show message on the screen for the popup
		 * as an indication to the admin/user that the process was
		 * successful.
		 *
		 * @param string $message - message to be shown to the admin.
		 * @return mixed
		 */
		protected function showSuccessMessage( $message ) {
			$message = str_replace( '{{MESSAGE}}', $message, $this->success_message_div );
			return str_replace( '{{CONTENT}}', $message, $this->pane_content );
		}

		/**
		 * This function is used to normal message on the screen for the popup
		 * as an indication to the admin/user that the process was
		 * successful.
		 *
		 * @param string $message - message to be shown to the admin.
		 * @return mixed
		 */
		protected function showMessage( $message ) {
			$message = str_replace( '{{MESSAGE}}', $message, $this->message_div );
			return str_replace( '{{CONTENT}}', $message, $this->pane_content );
		}

		/**
		 * This function detects if the form setting being saved or the preview
		 * request being made is for this popup or other templates/popups.
		 * Checks of the popuptype parameter in the request.
		 *
		 * @param array $data - $_POST.
		 *
		 * @return bool
		 */
		protected function isTemplateType( $data ) {
			return array_key_exists( 'popuptype', $data ) && strcasecmp( $data['popuptype'], $this->get_template_key() ) === 0;
		}

		/*
		|-------------------------------------------------------------------------
		| Getters
		|-------------------------------------------------------------------------
		 */

		/**
		 * This function returns the current Templates Key
		 *
		 * @return string
		 */
		public function get_template_key() {
			return $this->key;
		}

		/**
		 * This function returns the current Templates Editor Id
		 *
		 * @return string
		 */
		public function get_template_editor_id() {
			return $this->template_editor_id;
		}
	}
}
