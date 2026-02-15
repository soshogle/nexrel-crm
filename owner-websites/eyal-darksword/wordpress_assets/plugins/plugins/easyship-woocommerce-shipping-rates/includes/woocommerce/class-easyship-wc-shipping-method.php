<?php
/**
 * Easyship WC Shipping Method.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Include Easyship API.
require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-wc-shipping-api.php';

/**
 * Easyship Shipping Method class.
 */
final class Easyship_WC_Shipping_Method extends WC_Shipping_Method {
	private const DEPRECATED_SETTING__API_KEY    = 'api_key';
	private const DEPRECATED_SETTING__API_SECRET = 'api_secret';
	private const SETTING__BTN__CONNECT          = 'connect_to_easyship';
	private const SETTING__SKIP_SHIPPING_CLASSES = 'skip_shipping_classes';
	private const SETTING__API_ACCESS_TOKEN      = 'api_access_token';

	/**
	 * Discount for item.
	 *
	 * @var int
	 */
	private $discount_for_item = 0;

	/**
	 * Control discount.
	 *
	 * @var int
	 */
	private $control_discount = 0;

	/**
	 * Constructor.
	 *
	 * @param int $instance_id Instance ID.
	 */
	public function __construct( $instance_id = 0 ) {
		$this->id           = Easyship_WooCommerce_Integration::WC_SHIPPING_METHOD_ID;
		$this->instance_id  = absint( $instance_id );
		$this->method_title = esc_html__( 'Easyship', 'easyship-woocommerce-shipping-rates' );

		$this->supports = array(
			'shipping-zones',
			'settings',
			'instance-settings',
			'instance-settings-modal',
		);

		$is_in_instance_context = $this->instance_id > 0;

		// Load the settings API.
		$this->init_form_fields();
		$this->init_settings(); // Loads global settings into $this->settings.

		// Hide unwanted global fields + drop their saved values if empty.
		self::filter_fields( $this->form_fields, $this->settings, $is_in_instance_context );

		// Load instance settings if in instance context.
		if ( $is_in_instance_context ) {
			$this->init_instance_form_fields();
			$this->init_instance_settings(); // Loads per-instance settings into $this->instance_settings.

			// Hide unwanted instance fields + drop their saved values if empty.
			self::filter_fields( $this->instance_form_fields, $this->instance_settings, $is_in_instance_context );
		}

		// Keep the cached props in sync with the current context (global vs instance).
		$this->adjust_wc_cached_fields();

		// Save settings in admin if any have been defined (using Shipping/Settings API).

		// Route both the global settings page *and* zone-instance modals through our save.
		// - WC core will call `woocommerce_update_options_shipping_{$this->id}` for the global page.
		// - For zone instances, WC also fires `woocommerce_update_options_shipping_{$this->id}_{$instance_id}`.
		// Hooking both slugs to *our* `save_options()` keeps logic in one place and avoids
		// the need to hook `process_admin_options` directly.
		add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'save_options' ) );
		if ( $is_in_instance_context ) {
			add_action( 'woocommerce_update_options_shipping_' . $this->id . '_' . $this->instance_id, array( $this, 'save_options' ) );
		}

		add_action( 'update_option_woocommerce_' . $this->id . '_settings', array( $this, 'clear_cached_info' ), 10, 2 );
		if ( $is_in_instance_context ) {
			add_action( 'update_option_woocommerce_' . $this->id . '_' . $this->instance_id . '_settings', array( $this, 'clear_cached_info' ), 10, 2 );
		}
	}

	/**
	 * Remove legacy fields that should not be used (and are not relevant) anymore.
	 *
	 * @param array|null $fields    Field definitions (mutated in-place).
	 * @param array|null $settings  The settings array to evaluate conditions against (mutated in-place).
	 * @param bool       $is_in_instance_context  Whether the method is invoked in the context of a shipping method instance.
	 */
	private static function filter_fields( ?array &$fields, ?array &$settings, bool $is_in_instance_context ): void {
		// Always work with arrays.
		if ( ! is_array( $fields ) ) {
			$fields = array();
		}
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		// Remove irrelevant legacy fields.
		$has_global_access_token = ! empty( Easyship_WooCommerce_Integration::get_global_api_access_token() );

		if ( $is_in_instance_context ) {
			$should_drop_api_key_and_secret_fields =
				self::is_meaningful_option_value( $settings[ self::SETTING__API_ACCESS_TOKEN ] ?? null ) ||
				( ! self::is_meaningful_option_value( $settings[ self::DEPRECATED_SETTING__API_KEY ] ?? null ) && ! self::is_meaningful_option_value( $settings[ self::DEPRECATED_SETTING__API_SECRET ] ?? null ) );
		} else {
			$should_drop_api_key_and_secret_fields =
				$has_global_access_token ||
				( ! self::is_meaningful_option_value( $settings[ self::DEPRECATED_SETTING__API_KEY ] ?? null ) && ! self::is_meaningful_option_value( $settings[ self::DEPRECATED_SETTING__API_SECRET ] ?? null ) );
		}

		if ( $should_drop_api_key_and_secret_fields ) {
			unset(
				$fields[ self::DEPRECATED_SETTING__API_KEY ],
				$fields[ self::DEPRECATED_SETTING__API_SECRET ],
				$settings[ self::DEPRECATED_SETTING__API_KEY ],
				$settings[ self::DEPRECATED_SETTING__API_SECRET ]
			);
		}
	}

	/**
	 * Clear cached Easyship shipping info when options are updated.
	 *
	 * @param mixed $old_value The old option value.
	 * @param mixed $new_value The new option value.
	 */
	public function clear_cached_info( $old_value = null, $new_value = null ): void {
		Easyship_WC_Shipping_API::clear_cached_info( $this->instance_id );
	}

	/**
	 * Save options (works for both global and instance contexts).
	 *
	 * - Runs WC's own save routine (nonce + core fields).
	 * - Normalizes our custom fields.
	 * - Moves the Access Token into the central integration store (not kept in WC settings).
	 * - Writes back to the correct option key (global or instance).
	 *
	 * @return false|null  False when WC aborted saving; null otherwise.
	 */
	public function save_options() {
		// Let WooCommerce handle form processing & saving first.
		$saved = $this->process_admin_options(); // Handles core fields + nonce.
		if ( false === $saved ) {
			return $saved; // WC aborted.
		}

		$is_in_instance_context = $this->is_in_instance_context();

		// Reload what WC just saved so we can mutate it safely.
		if ( $is_in_instance_context ) {
			$this->init_instance_settings();
			$settings = $this->instance_settings;
		} else {
			$this->init_settings();
			$settings = $this->settings;
		}
		$settings = is_array( $settings ) ? $settings : array();

		// Normalize / post-process our custom fields.

		// No need to store this button's value.
		unset( $settings[ self::SETTING__BTN__CONNECT ] );

		if ( array_key_exists( self::SETTING__API_ACCESS_TOKEN, $settings ) ) {
			if ( ! $is_in_instance_context ) {
				Easyship_WooCommerce_Integration::set_global_api_access_token( $settings[ self::SETTING__API_ACCESS_TOKEN ] );
				unset( $settings[ self::SETTING__API_ACCESS_TOKEN ] );
			}
		}

		if ( array_key_exists( self::SETTING__SKIP_SHIPPING_CLASSES, $settings ) ) {
			$clean = $this->parse_slugs( $settings[ self::SETTING__SKIP_SHIPPING_CLASSES ] );
			if ( empty( $clean ) ) {
				unset( $settings[ self::SETTING__SKIP_SHIPPING_CLASSES ] );
			} else {
				$settings[ self::SETTING__SKIP_SHIPPING_CLASSES ] = implode( ', ', $clean );
			}
		}

		// Ensure we also drop legacy fields from what we persist to the DB.
		$dummy_fields = array(); // We just want to prune $settings.
		self::filter_fields( $dummy_fields, $settings, $is_in_instance_context );

		// Persist back to the correct option key (this is important!).
		$option_key = $is_in_instance_context ? $this->get_instance_option_key() : $this->get_option_key();
		update_option( $option_key, $settings );

		// Update in-memory copies so getters reflect changes immediately.
		if ( $is_in_instance_context ) {
			$this->instance_settings = $settings;
		} else {
			$this->settings = $settings;
		}
		$this->adjust_wc_cached_fields();
	}

	/**
	 * Keeps the cached props in sync with the current context (global vs instance).
	 */
	private function adjust_wc_cached_fields(): void {
		// Refresh the cached props.
		if ( $this->is_in_instance_context() ) {
			// Normalize to array defensively.
			$instance = is_array( $this->instance_settings ) ? $this->instance_settings : array();

			// Instance-scoped cache.
			$enabled = (string) ( $instance['enabled'] ?? 'yes' );

			// If title is empty, fall back to method_title (like WooCommerce does).
			$title = $instance['title'] ?? '';
			$title = ( '' !== trim( (string) $title ) ) ? (string) $title : $this->method_title;

			$this->enabled = $enabled;
			$this->title   = $title;
		} else {
			// Normalize to array defensively.
			$global = is_array( $this->settings ) ? $this->settings : array();

			// Global-scoped cache.
			$enabled = (string) ( $global['enabled'] ?? 'yes' );

			// If title is empty, fall back to method_title (like WooCommerce does).
			$title = $global['title'] ?? '';
			$title = ( '' !== trim( (string) $title ) ) ? (string) $title : $this->method_title;

			$this->enabled = $enabled;
			$this->title   = $title;
		}
	}

	/**
	 * Check if the shipping method is available for the given package.
	 *
	 * @param array $package Package details.
	 */
	public function is_available( $package ): bool {
		if ( ! parent::is_available( $package ) ) {
			return false;
		}
		return $this->has_usable_credentials();
	}

	/**
	 * Check if the shipping method has usable credentials.
	 */
	private function has_usable_credentials(): bool {
		// Token wins (instance token, otherwise global token).
		if ( '' !== $this->get_api_access_token() ) {
			return true;
		}

		// No token — allow legacy creds.
		if ( $this->is_in_instance_context() ) {
			$key    = $this->get_instance_option( self::DEPRECATED_SETTING__API_KEY, null );
			$secret = $this->get_instance_option( self::DEPRECATED_SETTING__API_SECRET, null );
		} else {
			$key    = $this->get_global_option( self::DEPRECATED_SETTING__API_KEY, null );
			$secret = $this->get_global_option( self::DEPRECATED_SETTING__API_SECRET, null );
		}
		return self::is_meaningful_option_value( $key ) && self::is_meaningful_option_value( $secret );
	}

	/**
	 * Check if the shipping method is in instance context.
	 */
	private function is_in_instance_context(): bool {
		return $this->instance_id > 0;
	}

	/**
	 * Get an option.
	 * Overrides the parent method to add some custom logic regarding our specific form fields.
	 * This method is invoked by generate_*_html() methods, which is why we need to override it, so that our particular form fields reflect the expected values.
	 *
	 * @param string $key Option key.
	 * @param mixed  $empty_value Value to return if option is empty.
	 * @return mixed
	 */
	public function get_option( $key, $empty_value = null ) {
		if ( $this->is_in_instance_context() ) {
			switch ( $key ) {
				case self::SETTING__BTN__CONNECT:
					return $this->button_text( $key ) ?? $empty_value;
			}
		} else {
			switch ( $key ) {
				case self::SETTING__BTN__CONNECT:
					return $this->button_text( $key ) ?? $empty_value;
				case self::SETTING__API_ACCESS_TOKEN:
					return $this->get_global_option( $key );
			}
		}

		return parent::get_option( $key, $empty_value );
	}

	/**
	 * Get a global option.
	 *
	 * @param string $key Option key.
	 * @param mixed  $default_value Default value.
	 * @return mixed
	 */
	private function get_global_option( $key, $default_value = '' ) {
		switch ( $key ) {
			case self::SETTING__API_ACCESS_TOKEN:
				$token = Easyship_WooCommerce_Integration::get_global_api_access_token();
				return ! empty( $token ) ? $token : $default_value;
			default:
				$settings = is_array( $this->settings ) ? $this->settings : array();
				return array_key_exists( $key, $settings ) ? $settings[ $key ] : $default_value;
		}
	}

	/**
	 * Treat null and trimmed '' as empty; keep '0' and other scalars.
	 *
	 * @param mixed $val Value to check.
	 */
	private static function is_meaningful_option_value( $val ): bool {
		if ( null === $val ) {
			return false;
		}
		if ( is_string( $val ) && '' === trim( $val ) ) {
			return false;
		}
		return true; // Accept '0', numbers, non-empty strings, bools, etc.
	}

	/**
	 * Get the effective value for a key: instance (if present) -> global (if present) -> default.
	 *
	 * @param string $key Option key.
	 * @param mixed  $default_value Default value.
	 * @return mixed
	 */
	private function get_effective_option( string $key, $default_value = '' ) {
		// Prefer the per-zone/instance value when we are in instance context.
		if ( $this->is_in_instance_context() ) {
			$v = $this->get_instance_option( $key, null );
			if ( self::is_meaningful_option_value( $v ) ) {
				return $v;
			}
		}
		// Fall back to global plugin settings.
		$global = $this->get_global_option( $key, null );
		if ( self::is_meaningful_option_value( $global ) ) {
			return $global;
		}

		return $default_value;
	}

	/**
	 * Parse a list of shipping-class slugs from admin input.
	 * Accepts commas, any whitespace, semicolons, and pipes as separators.
	 *
	 * Examples accepted:
	 *   "fragile, bulky  oversized"
	 *   "fragile;bulky|oversized"
	 *   "fragile ,  bulky\toversized\n"
	 *
	 * @param string|array $raw The raw input to parse.
	 */
	private function parse_slugs( $raw ): array {
		// If someone passed an array already, flatten to string first (defensive).
		if ( is_array( $raw ) ) {
			$raw = implode( ',', array_filter( array_map( 'strval', $raw ) ) );
		} else {
			$raw = (string) $raw;
		}

		// Split on commas, any whitespace, semicolons, or pipes.
		$parts = preg_split( '/[,\s;|]+/u', $raw, -1, PREG_SPLIT_NO_EMPTY );

		// Sanitize each slug like WP would (lowercase, strip unsafe chars).
		$parts = array_map( 'sanitize_title', $parts );

		// Drop empties (post-sanitization) and de-duplicate.
		$parts = array_values( array_unique( array_filter( $parts, static function ( $s ) {
			return '' !== $s;
		} ) ) );

		return $parts;
	}

	/**
	 * Merge global and (if applicable) per-instance skip shipping class slugs lists.
	 *
	 * @param bool $include_global Whether to include global skip shipping class slugs.
	 * @param bool $include_instance Whether to include per-instance skip shipping class slugs.
	 */
	private function get_skip_shipping_class_slugs( bool $include_global = true, bool $include_instance = true ): array {
		// Global (Settings -> Shipping -> Easyship).
		if ( $include_global ) {
			$global_raw = $this->get_global_option( self::SETTING__SKIP_SHIPPING_CLASSES, '' );
			$global     = $this->parse_slugs( $global_raw );
		} else {
			$global = array();
		}

		// Per-zone (instance).
		if ( $include_instance && $this->is_in_instance_context() ) {
			$inst_raw = $this->get_instance_option( self::SETTING__SKIP_SHIPPING_CLASSES, '' );
			$inst     = $this->parse_slugs( $inst_raw );
		} else {
			$inst = array();
		}

		// Additive: global U instance.
		return array_values( array_unique( array_merge( $global, $inst ) ) );
	}

	/**
	 * Get the API access token for the current instance, or the global one if the former is not set.
	 *
	 * @return string
	 */
	private function get_api_access_token(): string {
		if ( $this->is_in_instance_context() ) {
			$instance_token = (string) $this->get_instance_option( self::SETTING__API_ACCESS_TOKEN, '' );
			$instance_token = trim( $instance_token );
			if ( '' !== $instance_token ) {
				return $instance_token; // Instance token wins.
			}

			// IMPORTANT: if instance has legacy creds, DO NOT fall back to global token.
			$key    = $this->get_instance_option( self::DEPRECATED_SETTING__API_KEY, null );
			$secret = $this->get_instance_option( self::DEPRECATED_SETTING__API_SECRET, null );
			if ( self::is_meaningful_option_value( $key ) && self::is_meaningful_option_value( $secret ) ) {
				return ''; // Force legacy auth path (no token).
			}
		}

		// No instance token and no instance legacy -> consider global token.
		$global_token = (string) $this->get_global_option( self::SETTING__API_ACCESS_TOKEN, '' );
		return trim( $global_token );
	}

	/**
	 * Get the text for a button.
	 *
	 * @param string $key Field key.
	 * @return string|null
	 */
	private function button_text( string $key ) {
		switch ( $key ) {
			case self::SETTING__BTN__CONNECT:
				return __( 'Connect', 'easyship-woocommerce-shipping-rates' );
		}
	}

	/**
	 * Define global settings fields for this shipping method.
	 */
	public function init_form_fields(): void {
		$this->form_fields = array_merge(
			array(
				self::SETTING__BTN__CONNECT          => array(
					'title'       => esc_html__( 'Connect to Easyship', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'button',
					/* translators: %s: Easyship URL link */
					'description' => sprintf( esc_html__( 'Click \'Connect\' to link your store with %s. You can also create an Easyship account to obtain your Access Token and paste it below.', 'easyship-woocommerce-shipping-rates' ), wp_kses( '<a href="https://www.easyship.com" target="_blank">Easyship</a>', array(
						'a' => array(
							'href'   => array(),
							'target' => array(),
						),
					) ) ),
				),
				self::DEPRECATED_SETTING__API_KEY    => array(
					'title'       => esc_html__( 'API Key', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => esc_html__( 'Enter your Easyship API Key.', 'easyship-woocommerce-shipping-rates' ),
				),
				self::DEPRECATED_SETTING__API_SECRET => array(
					'title'       => esc_html__( 'API Secret', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'textarea',
					'description' => esc_html__( 'Enter your Easyship API Secret.', 'easyship-woocommerce-shipping-rates' ),
				),
				self::SETTING__API_ACCESS_TOKEN      => array(
					'title'       => esc_html__( 'Easyship Access Token', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => esc_html__( 'Paste your Easyship Access Token. You can find this in your Easyship dashboard, in your store\'s page under “Access Token”. This is also the place where you will be able to set all your shipping options and rules.', 'easyship-woocommerce-shipping-rates' ),
				),
				self::SETTING__SKIP_SHIPPING_CLASSES => array(
					'title'       => esc_html__( 'Global Skip Shipping Classes', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => esc_html__( 'Enter one or more shipping class slugs, separated by commas or spaces. Products in these classes will always be excluded from Easyship rates, in all shipping zones. The slugs can be found in "WooCommerce > Settings > Shipping > Shipping classes"', 'easyship-woocommerce-shipping-rates' ),
				),
			),
			$this->form_fields
		);
	}

	/**
	 * Define instance settings fields for this shipping method instance.
	 */
	public function init_instance_form_fields(): void {
		$this->instance_form_fields = array_merge(
			array(
				self::SETTING__BTN__CONNECT          => array(
					'title'       => esc_html__( 'Connect to Easyship', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'button',
					/* translators: %s: Easyship URL link */
					'description' => sprintf( esc_html__( 'Click \'Connect\' to link your store with %s. You can also create an Easyship account to obtain your Access Token and paste it below.', 'easyship-woocommerce-shipping-rates' ), wp_kses( '<a href="https://www.easyship.com" target="_blank">Easyship</a>', array(
						'a' => array(
							'href'   => array(),
							'target' => array(),
						),
					) ) ),
				),
				self::DEPRECATED_SETTING__API_KEY    => array(
					'title'       => esc_html__( 'API Key', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => esc_html__( 'Enter your Easyship API Key for this zone (optional).', 'easyship-woocommerce-shipping-rates' ),
					'desc_tip'    => true,
				),
				self::DEPRECATED_SETTING__API_SECRET => array(
					'title'       => esc_html__( 'API Secret', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'textarea',
					'description' => esc_html__( 'Enter your Easyship API Secret for this zone (optional).', 'easyship-woocommerce-shipping-rates' ),
					'desc_tip'    => true,
				),
				self::SETTING__API_ACCESS_TOKEN      => array(
					'title'       => esc_html__( 'Easyship Access Token', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => esc_html__( 'Paste an Access Token for this zone (optional). If empty, the global Access Token will be used.', 'easyship-woocommerce-shipping-rates' ),
				),
				self::SETTING__SKIP_SHIPPING_CLASSES => array(
					'title'       => esc_html__( 'Additional Skip Shipping Classes', 'easyship-woocommerce-shipping-rates' ),
					'type'        => 'text',
					'description' => sprintf(
						/* translators: %s is a list of slugs wrapped in HTML <strong> */
						__( 'Enter one or more shipping class slugs, separated by commas or spaces. Products in these classes will be excluded from Easyship rates in this zone, in addition to any global exclusions.<br>Globally excluded shipping classes: %s', 'easyship-woocommerce-shipping-rates' ),
						wp_kses(
							( function () {
								$globals_only = $this->get_skip_shipping_class_slugs( true, false );
								$globals_str  = $globals_only ? ( '<strong>' . implode( '</strong>, <strong>', $globals_only ) . '</strong>' ) : esc_html__( '(none)', 'easyship-woocommerce-shipping-rates' );
								return $globals_str;
							} )(),
							array(
								'strong' => array(),
							)
						)
					),
					'extra_props' => array(
						'adds_to_global_setting' => true,
					),
				),
			),
			$this->instance_form_fields
		);
	}

	/**
	 * Render the settings table (works for both global and instance contexts).
	 * This override basically adds some placeholders to the fields, to facilitate the admin's viewing of information and determining whether site-specific overrides are necessary.
	 *
	 * @param array $form_fields Optional custom field array. If empty, uses $this->get_form_fields() or $this->get_instance_form_fields(), depending on context.
	 * @param bool  $echo_result Echo or return HTML.
	 * @return string|void
	 */
	public function generate_settings_html( $form_fields = array(), $echo_result = true ) {
		$is_in_instance_context = $this->is_in_instance_context();

		// If caller didn’t pass fields, choose the right set (global vs instance).
		if ( empty( $form_fields ) ) {
			$form_fields = $is_in_instance_context ? $this->get_instance_form_fields() : $this->get_form_fields();
		}

		// Adjust fields *before* rendering.
		foreach ( $form_fields as $key => $field ) {
			// Ensure 'type' always exists (WC expects it).
			$field['type'] = $field['type'] ?? 'text';

			$extra_props = $field['extra_props'] ?? array();

			if ( $is_in_instance_context ) {
				// We are in the zone method instance configuration form.

				$extra_props__adds_to_global_setting = (bool) ( $extra_props['adds_to_global_setting'] ?? false );

				// Add instance placeholders from global (unless explicitly additive-to-global).
				if ( empty( $field['placeholder'] ) && ! $extra_props__adds_to_global_setting ) {
					// Can't call get_option() here because it will look at the instance settings first, and we want to look solely at global settings.
					$field['placeholder'] = $this->get_global_option( $key, '' );
				}
			}

			// IMPORTANT: write back the mutated field.
			$form_fields[ $key ] = $field;
		}

		return parent::generate_settings_html( $form_fields, $echo_result );
	}

	/**
	 * This function is used to calculate the shipping cost. Within this function we can check for weights, dimensions and other parameters.
	 *
	 * @param array $package Package.
	 */
	public function calculate_shipping( $package = array() ): void {
		if ( 'yes' !== $this->enabled ) {
			return; // Safety check: admin disabled this method for the zone.
		}

		$destination     = $package['destination'];
		$items           = array();
		$product_factory = new WC_Product_Factory();
		$currency        = get_woocommerce_currency();

		// @since 0.4.2
		// Support WooCommerce Currency Switcher.
		if ( defined( 'WOOCS_VERSION' ) ) {
			// phpcs:disable WordPress.NamingConventions.ValidVariableName
			global $WOOCS;
			$currency = $WOOCS->current_currency;
			// Rates API already return rates with currency converted, so no need for WOOCS to convert.
			$WOOCS->is_multiple_allowed = false;
			// phpcs:enable WordPress.NamingConventions.ValidVariableName
		}

		if ( method_exists( WC()->cart, 'get_discount_total' ) ) {
			$total_discount = WC()->cart->get_discount_total();
		} elseif ( method_exists( WC()->cart, 'get_cart_discount_total' ) ) {
			$total_discount = WC()->cart->get_cart_discount_total();
		} else {
			$total_discount = 0;
		}

		if ( method_exists( WC()->cart, 'get_subtotal' ) ) {
			$total_cart_without_discount = WC()->cart->get_subtotal();
		} else {
			$total_cart_without_discount = WC()->cart->subtotal;
		}

		if ( ! empty( $total_discount ) && ( $total_discount > 0 ) ) {
			$discount_for_item = ( $total_discount / $total_cart_without_discount ) * 100;

			$this->discount_for_item = $discount_for_item;

			unset( $discount_for_item );
		}

		$skip_shipping_class_slugs = $this->get_skip_shipping_class_slugs();

		foreach ( $package['contents'] as $item ) {
			// Default product - assume it is simple product.
			$product = $product_factory->get_product( $item['product_id'] );

			$prod_slug = $product ? $product->get_shipping_class() : '';
			if ( $prod_slug && in_array( $prod_slug, $skip_shipping_class_slugs, true ) ) {
				continue; // Skip this item entirely.
			}

			// Check version.
			if ( WC()->version < '2.7.0' ) {
				// If this item is variation, get variation product instead.
				if ( 'variation' === $item['data']->product_type ) {
					$product = $product_factory->get_product( $item['variation_id'] );
				}

				// Exclude virtual and downloadable product.
				if ( 'yes' === $item['data']->virtual ) {
					continue;
				}
			} else {
				if ( 'variation' === $item['data']->get_type() ) {
					$product = $product_factory->get_product( $item['variation_id'] );
				}

				if ( 'yes' === $item['data']->get_virtual() ) {
					continue;
				}
			}

			if ( array_key_exists( 'variation_id', $item ) ) {
				if ( 0 === $item['variation_id'] ) {
					$identifier_id = $item['product_id'];
				} else {
					$identifier_id = $item['variation_id'];
				}
			} else {
				$identifier_id = $item['product_id'];
			}

			$items[] = array(
				'actual_weight'          => $this->weight_to_kg( $product->get_weight() ),
				'height'                 => $this->default_dimension( $this->dimension_to_cm( $product->get_height() ) ),
				'width'                  => $this->default_dimension( $this->dimension_to_cm( $product->get_width() ) ),
				'length'                 => $this->default_dimension( $this->dimension_to_cm( $product->get_length() ) ),
				'declared_currency'      => $currency,
				'declared_customs_value' => $this->declared_customs_value( $item['line_subtotal'], $item['quantity'] ),
				'identifier_id'          => $identifier_id,
				'sku'                    => $product->get_sku(),
				'quantity'               => $item['quantity'],
			);
		}

		if ( method_exists( WC()->cart, 'get_cart_contents_total' ) ) {
			$total_cart_with_discount = (float) WC()->cart->get_cart_contents_total();
		} else {
			$total_cart_with_discount = WC()->cart->cart_contents_total;
		}

		if ( ( $this->control_discount !== $total_cart_with_discount ) && ( is_array( $items ) && isset( $items[0] ) && isset( $items[0]['declared_customs_value'] ) ) ) {
			$diff                                = round( ( $total_cart_with_discount - $this->control_discount ), 2 );
			$items[0]['declared_customs_value'] += $diff;
			$this->add_control_discount( $diff );
			unset( $diff );
		}

		try {
			$shipping_api = new Easyship_WC_Shipping_API( $this->get_api_access_token(), $this->get_effective_option( self::DEPRECATED_SETTING__API_KEY, null ), $this->get_effective_option( self::DEPRECATED_SETTING__API_SECRET, null ), $this->get_effective_option( 'es_taxes_duties', null ), array( 'shipping_method_instance_id' => $this->instance_id ) );

			$preferred_rates = $shipping_api->get_shipping_rate( $destination, $items );
		} catch ( \Throwable $e ) {
			// Exception or Error.
			Easyship_Logger::error( $e->getMessage() );
			$preferred_rates = array();
		}

		foreach ( $preferred_rates as $rate ) {
			$shipping_rate = array(
				'id'        => $rate['courier_id'],
				'label'     => $rate['full_description'],
				'cost'      => $rate['total_charge'],
				'meta_data' => array( 'courier_id' => $rate['courier_id'] ),
			);

			wp_cache_add( 'easyship:' . $this->instance_id . ':' . $rate['courier_id'], $rate );

			$this->add_rate( $shipping_rate );
		}
	}

	/**
	 * Add control discount.
	 *
	 * @param int $val Value.
	 */
	private function add_control_discount( $val ): void {
		$this->control_discount += $val;
	}

	/**
	 * This function calculates the declared customs value.
	 *
	 * @param float $subtotal Subtotal.
	 * @param float $count Count.
	 * @return number
	 */
	private function declared_customs_value( float $subtotal, float $count ) {
		// Guard against bad input.
		if ( $count <= 0.0 || $subtotal <= 0.0 ) {
			return 0.0;
		}

		$discount_percent = (float) $this->discount_for_item; // E.g. 15 means 15%.

		// Convert "percent off" into a factor (clamped to [0,1]) that indicates how much of the original price will remain.
		$subtotal_after_discount_factor = max( 0.0, min( 1.0, ( 100.0 - $discount_percent ) / 100.0 ) );

		// Exact line total after discount, rounded to 2 dp.
		$subtotal_after_discount = round( $subtotal * $subtotal_after_discount_factor, 2 );

		// Per-item value for display/use (independent rounding).
		$per_item = round( $subtotal_after_discount / $count, 2 );

		// Accumulate the exact line total (not per_item * count).
		$this->add_control_discount( $subtotal_after_discount );

		return $per_item;
	}

	/**
	 * This function converts weight to kg.
	 *
	 * @param float $weight Weight.
	 */
	private function weight_to_kg( $weight ): float {
		$weight      = floatval( $weight );
		$weight_unit = get_option( 'woocommerce_weight_unit' );

		// If weight_unit is kg we do not need to convert it.
		if ( 'g' === $weight_unit ) {
			$weight = $weight * 0.001;
		} elseif ( 'lbs' === $weight_unit ) {
			$weight = $weight * 0.453592;
		} elseif ( 'oz' === $weight_unit ) {
			$weight = $weight * 0.0283495;
		}

		return $weight;
	}

	/**
	 * This function converts dimension to cm.
	 *
	 * @param float $length Length.
	 */
	private function dimension_to_cm( $length ): float {
		$length         = floatval( $length );
		$dimension_unit = get_option( 'woocommerce_dimension_unit' );

		// If dimension_unit is cm we do not need to convert it.
		if ( 'm' === $dimension_unit ) {
			$length = $length * 100;
		} elseif ( 'mm' === $dimension_unit ) {
			$length = $length * 0.1;
		} elseif ( 'in' === $dimension_unit ) {
			$length = $length * 2.54;
		} elseif ( 'yd' === $dimension_unit ) {
			$length = $length * 91.44;
		}

		return $length;
	}

	/**
	 * Defaults dimension to 1 if it is 0.
	 *
	 * @param float $length Length.
	 */
	private function default_dimension( float $length ): float {
		return $length > 0 ? $length : 1;
	}
}
