<?php
/**
 * Class WOOMULTI_CURRENCY_Admin_Shipping
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Admin_Shipping {
	protected $settings;
	protected $flat_rate_processed = array();

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->check_fixed_price() ) {
			add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
			/*Free shipping*/
			add_filter( 'woocommerce_shipping_instance_form_fields_free_shipping', array(
				$this,
				'woocommerce_shipping_instance_form_fields_free_shipping'
			) );
			add_filter( 'woocommerce_shipping_free_shipping_instance_settings_values', array(
				$this,
				'woocommerce_shipping_free_shipping_instance_settings_values'
			) );
			/*Flat rate*/
			add_filter( 'woocommerce_shipping_instance_form_fields_flat_rate', array(
				$this,
				'woocommerce_shipping_instance_form_fields_flat_rate'
			) );
			add_filter( 'woocommerce_shipping_flat_rate_instance_settings_values', array(
				$this,
				'woocommerce_shipping_flat_rate_instance_settings_values'
			) );
		}
	}

	public function admin_enqueue_scripts() {
		global $pagenow;
		if ( $pagenow === 'admin.php' ) {
			if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_admin_nonce' ) ) {
				return;
			}
			$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';
			$tab  = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : '';
			if ( $page === 'wc-settings' && $tab === 'shipping' ) {
				wp_enqueue_script( 'woocommerce-multi-currency-admin-shipping', WOOMULTI_CURRENCY_JS . 'admin-shipping.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
				wp_localize_script( 'woocommerce-multi-currency-admin-shipping', 'woocommerce_multi_currency_admin_shipping', array(
					'currencies' => $this->settings->get_currencies(),
				) );
			}
		}
	}

	/**
	 * Remove fixed min_amount field if a currency not existing or is the default currency
	 *
	 * @param $instance_settings
	 *
	 * @return mixed
	 */
	public function woocommerce_shipping_free_shipping_instance_settings_values( $instance_settings ) {
		$currencies       = $this->settings->get_currencies();
		$default_currency = $this->settings->get_default_currency();
		foreach ( $instance_settings as $key => $value ) {
			if ( substr( $key, 0, 11 ) === 'min_amount_' ) {
				$currency = substr( $key, 11, 3 );
				if ( $currency === $default_currency || ! in_array( $currency, $currencies ) ) {
					unset( $instance_settings[ $key ] );
				}
			}
		}

		return $instance_settings;
	}

	/**
	 * Add fixed min_amount for other currencies
	 *
	 * This filter also applies to frontend
	 *
	 * @param $fields
	 *
	 * @return array
	 */
	public function woocommerce_shipping_instance_form_fields_free_shipping( $fields ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_admin_nonce' ) ) {
			return $fields;
		}
		if ( ! wp_doing_ajax() && is_admin() && ! isset( $_GET['zone_id'] ) ) {
			return $fields;
		}
		$modified_fields  = array();
		$currencies       = $this->settings->get_currencies();
		$default_currency = $this->settings->get_default_currency();
		foreach ( $fields as $key => $field ) {
			$modified_fields[ $key ] = $field;
			if ( $key === 'min_amount' ) {
				/* translators: %s: currency default */
				$this->add_fixed_price_fields( $key, $field, $currencies, $default_currency, $modified_fields, sprintf( esc_html__( 'Converted from %s if empty', 'woocommerce-multi-currency' ), $default_currency ) );
			}
		}

		return $modified_fields;
	}

	/**
	 * Remove fixed cost field if a currency not existing or is the default currency
	 *
	 * @param $instance_settings
	 *
	 * @return mixed
	 */
	public function woocommerce_shipping_flat_rate_instance_settings_values( $instance_settings ) {
		$currencies       = $this->settings->get_currencies();
		$default_currency = $this->settings->get_default_currency();
		foreach ( $instance_settings as $key => $value ) {
			if ( substr( $key, 0, 5 ) === 'cost_' || substr( $key, 0, 14 ) === 'no_class_cost_' || ( substr( $key, 0, 11 ) === 'class_cost_' ) && count( explode( '_', $key ) ) === 4 ) {
				$currency = substr( $key, strlen( $key ) - 3, 3 );
				if ( $currency === $default_currency || ! in_array( $currency, $currencies ) ) {
					unset( $instance_settings[ $key ] );
				}
			}
		}

		return $instance_settings;
	}

	/**
	 * Add fixed cost for other currencies
	 *
	 * This filter also applies to frontend
	 *
	 * @param $fields
	 *
	 * @return array
	 */
	public function woocommerce_shipping_instance_form_fields_flat_rate( $fields ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_admin_nonce' ) ) {
			return $fields;
		}
		if ( ! wp_doing_ajax() && is_admin() && ! isset( $_GET['zone_id'] ) ) {
			return $fields;
		}
		$modified_fields  = array();
		$currencies       = $this->settings->get_currencies();
		$default_currency = $this->settings->get_default_currency();
		foreach ( $fields as $key => $field ) {
			$modified_fields[ $key ] = $field;
			if ( $key === 'cost' || $key === 'no_class_cost' || substr( $key, 0, 11 ) === 'class_cost_' ) {
				if ( isset( $field['sanitize_callback'] ) ) {
					foreach ( $field['sanitize_callback'] as $sanitize_callback ) {
						if ( is_a( $sanitize_callback, 'WC_Shipping_Flat_Rate' ) ) {
							if ( $sanitize_callback->instance_id && empty( $this->flat_rate_processed[ $sanitize_callback->instance_id ][ $key ] ) ) {
								$this->flat_rate_processed[ $sanitize_callback->instance_id ] = $key;
								/* translators: %s: currency default */
								$this->add_fixed_price_fields( $key, $field, $currencies, $default_currency, $modified_fields, false, sprintf( esc_html__( 'If this field is not explicitly set but {default_field} is, the whole shipping cost in {current_currency} will be calculated by converting from %s', 'woocommerce-multi-currency' ), $default_currency ), esc_html__( 'Formula can also be used here. [cost] is already in {current_currency} and [fee] is calculated based on fee in {current_currency}. Other amounts entered here such as a fixed amount, min_fee, max_fee... should also be in {current_currency}.', 'woocommerce-multi-currency' ) );
							}
							break;
						}
					}
				}
			}
		}

		return $modified_fields;
	}

	/**
	 * @param $key
	 * @param $field
	 * @param $currencies
	 * @param $default_currency
	 * @param $modified_fields
	 * @param bool $placeholder
	 * @param string $description
	 * @param bool|string $desc_tip
	 */
	private function add_fixed_price_fields( $key, $field, $currencies, $default_currency, &$modified_fields, $placeholder = false, $description = '', $desc_tip = false ) {
		/* translators: %s: currency default */
		$modified_fields[ $key ]['title'] .= sprintf( esc_html__( '(%s)', 'woocommerce-multi-currency' ), $default_currency );
		foreach ( $currencies as $currency ) {
			if ( $currency !== $default_currency ) {
				$modified_fields["{$key}_{$currency}"]          = $field;
				/* translators: %1s: currency title, %2s: currency symbol */
				$modified_fields["{$key}_{$currency}"]['title'] = sprintf( esc_html__( '%1$s(%2$s)', 'woocommerce-multi-currency' ), $field['title'], $currency );
				if ( $description ) {
					$modified_fields["{$key}_{$currency}"]['description'] = str_replace( array(
						'{current_currency}',
						'{default_field}'
					), array( $currency, $modified_fields[ $key ]['title'] ), $description );
				}
				$modified_fields["{$key}_{$currency}"]['desc_tip'] = $desc_tip ? str_replace( array( '{current_currency}' ), array( $currency ), $desc_tip ) : $desc_tip;
				$modified_fields["{$key}_{$currency}"]['default']  = '';
				if ( $placeholder !== false ) {
					$modified_fields["{$key}_{$currency}"]['placeholder'] = $placeholder;
				}
			}
		}
	}
}