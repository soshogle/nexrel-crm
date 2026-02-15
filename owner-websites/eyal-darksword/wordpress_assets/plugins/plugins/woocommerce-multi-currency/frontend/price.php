<?php

use Automattic\Jetpack\Constants;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Frontend_Price
 */
class WOOMULTI_CURRENCY_Frontend_Price {
	protected static $settings;
	protected static $language;
	protected $price;
	protected $change;
	protected static $decimal_data = '';
	public $prepare_param;
	public $show_approximate_price;

	public function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		$this->change   = false;

		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		//Fix for FB WC feed data
		if ( isset( $_GET['wc-api'] ) && $_GET['wc-api'] === 'wc_facebook_get_feed_data' ) {
			return;
		}

		if ( self::$settings->get_enable() ) {

			/*Pay with Multi Currencies*/
			add_action( 'init', array( $this, 'init' ), 99 );
			add_action( 'init', array( $this, 'add_change_price_hooks' ), 100 );

			/*Approximately*/
			add_action( 'init', array( $this, 'prepare_params' ), 999 );

			if ( self::$settings->get_price_collate() ) {
				//(int) self::$settings->get_params( 'price_collate_single' )
				switch ( self::$settings->get_params( 'price_collate_archive' ) ) {
					case 'before_price':
					case 'before_sale_flash':
						add_action( 'woocommerce_before_template_part', array( $this, 'price_collate_before_template_loop' ) );
						break;
					case 'after_price':
					case 'after_sale_flash':
						add_action( 'woocommerce_after_template_part', array( $this, 'price_collate_after_template_loop' ) );
						break;
					case 'after_title':
						add_action( 'woocommerce_after_shop_loop_item_title', [ $this, 'price_collate_after_title' ] );
						break;
					default:
				}
				add_action( 'woocommerce_single_product_summary', [ $this, 'price_collate_single' ], (int) self::$settings->get_params( 'price_collate_single' ) );
			}
			if ( self::$settings->get_price_switcher() ) {
				add_action( 'woocommerce_single_product_summary', array(
					$this,
					'add_price_switcher'
				), (int) self::$settings->get_params( 'price_switcher_position' ) );
			}

			add_filter( 'wmc_get_price', array( $this, 'format_beauty_price' ), 99, 2 );
//			add_filter( 'wmc_is_get_price_shipping', array( $this, 'apply_beauty_price_to_shipping' ) );

			add_filter( 'wmc_set_decimals', array( $this, 'override_decimal' ), 999 );
			add_filter( 'wc_get_price_thousand_separator', array( $this, 'wc_get_price_thousand_separator' ), 999 );
			add_filter( 'wc_get_price_decimal_separator', array( $this, 'wc_get_price_decimal_separator' ), 999 );

			add_filter( 'woocommerce_structured_data_product_offer', array( $this, 'woocommerce_structured_data_product_offer' ), 10, 2 );

			if ( is_plugin_active( 'woocommerce-bookings/woocommerce-bookings.php' ) ) {
				/*Fix wrong sale price added when changing currency for WooCommerce Bookings products*/
				add_filter( 'woocommerce_get_price_html', array( $this, 'woocommerce_get_price_html' ), 20, 2 );
			}
			if ( is_plugin_active( 'paid-member-subscriptions/index.php' ) ) {
				$current_currency = self::$settings->get_current_currency();
				$default_currency = self::$settings->get_default_currency();
				$hook_priority    = class_exists( 'B2bking' ) ? 99999 : 99;

				if ( $default_currency !== $current_currency || ( isset( $_REQUEST['wc-ajax'] ) && wc_clean( wp_unslash( $_REQUEST['wc-ajax'] ) ) == 'update_order_review' ) ) {
					/*Simple product*/
					add_filter( 'woocommerce_product_get_regular_price', array(
						$this,
						'woocommerce_product_get_regular_price'
					), $hook_priority, 2 );
					add_filter( 'woocommerce_product_get_sale_price', array(
						$this,
						'woocommerce_product_get_sale_price'
					), $hook_priority, 2 );
					add_filter( 'woocommerce_product_get_price', array(
						$this,
						'woocommerce_product_get_price'
					), $hook_priority, 2 );

					/*Variable price*/
					add_filter( 'woocommerce_product_variation_get_price', array(
						$this,
						'woocommerce_product_variation_get_price'
					), $hook_priority, 2 );
					add_filter( 'woocommerce_product_variation_get_regular_price', array(
						$this,
						'woocommerce_product_variation_get_regular_price'
					), $hook_priority, 2 );
					add_filter( 'woocommerce_product_variation_get_sale_price', array(
						$this,
						'woocommerce_product_variation_get_sale_price'
					), $hook_priority, 2 );

					/*Variable Parent min max price*/
					add_filter( 'woocommerce_variation_prices', array(
						$this,
						'get_woocommerce_variation_prices'
					), $hook_priority, 3 );
				}
			}

			/*Yith dynamic pricing and discount*/
			add_action( 'ywdpd_before_calculate_discounts', array( $this, 'remove_filters' ), 1 );
			add_action( 'ywdpd_after_calculate_discounts', array( $this, 'add_filters' ), 1 );
			if ( is_plugin_active( 'yith-woocommerce-dynamic-pricing-and-discounts-premium/init.php' ) ) {
				add_action( 'ywdpd_before_get_price_to_discount', array( $this, 'remove_filters' ), 1 );
				add_action( 'ywdpd_after_get_price_to_discount', array( $this, 'add_filters' ), 1 );
			}

//			add_action('wp_footer',function (){
//				$cart = wc()->cart;
//				echo '<pre>'.print_r($cart->get_cart_contents(),true).'</pre>';
//			});
		}
	}

	public function add_change_price_hooks() {
		if ( is_plugin_active( 'paid-member-subscriptions/index.php' ) ) {
			return;
		}
		$current_currency = self::$settings->get_current_currency();
		$default_currency = self::$settings->get_default_currency();
		$hook_priority    = class_exists( 'B2bking' ) ? 99999 : 99;

		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}

		if ( apply_filters( 'wmc_is_change_price', $default_currency !== $current_currency ) || ( isset( $_REQUEST['wc-ajax'] ) && wc_clean( wp_unslash( $_REQUEST['wc-ajax'] ) ) == 'update_order_review' ) ) {
			/*Simple product*/
			add_filter( 'woocommerce_product_get_regular_price', array(
				$this,
				'woocommerce_product_get_regular_price'
			), $hook_priority, 2 );
			add_filter( 'woocommerce_product_get_sale_price', array(
				$this,
				'woocommerce_product_get_sale_price'
			), $hook_priority, 2 );
			add_filter( 'woocommerce_product_get_price', array(
				$this,
				'woocommerce_product_get_price'
			), $hook_priority, 2 );

			/*Variable price*/
			add_filter( 'woocommerce_product_variation_get_price', array(
				$this,
				'woocommerce_product_variation_get_price'
			), $hook_priority, 2 );
			add_filter( 'woocommerce_product_variation_get_regular_price', array(
				$this,
				'woocommerce_product_variation_get_regular_price'
			), $hook_priority, 2 );
			add_filter( 'woocommerce_product_variation_get_sale_price', array(
				$this,
				'woocommerce_product_variation_get_sale_price'
			), $hook_priority, 2 );

//			if ( ! is_plugin_active( 'pw-woocommerce-on-sale/pw-on-sale.php' ) ) {
//				/*Simple product*/
//				add_filter( 'woocommerce_product_get_sale_price', array( $this, 'woocommerce_product_get_sale_price' ), 99, 2 );
//				add_filter( 'woocommerce_product_get_price', array( $this, 'woocommerce_product_get_price' ), 99, 2 );
//
//				/*Variable price*/
//				add_filter( 'woocommerce_product_variation_get_regular_price', array( $this, 'woocommerce_product_variation_get_regular_price' ), 99, 2 );
//				add_filter( 'woocommerce_product_variation_get_sale_price', array( $this, 'woocommerce_product_variation_get_sale_price' ), 99, 2 );
//			}

			/*Variable Parent min max price*/
			add_filter( 'woocommerce_variation_prices', array( $this, 'get_woocommerce_variation_prices' ), 99, 3 );
		}
	}

	public function remove_filters() {
		$hook_priority    = class_exists( 'B2bking' ) ? 99999 : 99;
		remove_filter( 'woocommerce_product_get_regular_price', array( $this, 'woocommerce_product_get_regular_price' ), $hook_priority );
		remove_filter( 'woocommerce_product_get_sale_price', array( $this, 'woocommerce_product_get_sale_price' ), $hook_priority );
		remove_filter( 'woocommerce_product_get_price', array( $this, 'woocommerce_product_get_price' ), $hook_priority );

		remove_filter( 'woocommerce_product_variation_get_regular_price', array( $this, 'woocommerce_product_variation_get_regular_price' ), $hook_priority );
		remove_filter( 'woocommerce_product_variation_get_sale_price', array( $this, 'woocommerce_product_variation_get_sale_price' ), $hook_priority );
		remove_filter( 'woocommerce_product_variation_get_price', array( $this, 'woocommerce_product_variation_get_price' ), $hook_priority );
		remove_filter( 'woocommerce_variation_prices', array( $this, 'get_woocommerce_variation_prices' ), $hook_priority );
	}

	public function add_filters() {
		$hook_priority    = class_exists( 'B2bking' ) ? 99999 : 99;
		add_filter( 'woocommerce_product_get_regular_price', array( $this, 'woocommerce_product_get_regular_price' ), $hook_priority, 2 );
		add_filter( 'woocommerce_product_get_sale_price', array( $this, 'woocommerce_product_get_sale_price' ), $hook_priority, 2 );
		add_filter( 'woocommerce_product_get_price', array( $this, 'woocommerce_product_get_price' ), $hook_priority, 2 );

		add_filter( 'woocommerce_product_variation_get_regular_price', array( $this, 'woocommerce_product_variation_get_regular_price' ), $hook_priority, 2 );
		add_filter( 'woocommerce_product_variation_get_sale_price', array( $this, 'woocommerce_product_variation_get_sale_price' ), $hook_priority, 2 );
		add_filter( 'woocommerce_product_variation_get_price', array( $this, 'woocommerce_product_variation_get_price' ), $hook_priority, 2 );
		add_filter( 'woocommerce_variation_prices', array( $this, 'get_woocommerce_variation_prices' ), $hook_priority, 3 );
	}

	/**
	 * @param $price_html
	 * @param $product WC_Product_Booking
	 *
	 * @return string
	 */
	public function woocommerce_get_price_html( $price_html, $product ) {
		if ( $product && is_a( $product, 'WC_Product_Booking' ) && self::$settings->get_current_currency() !== self::$settings->get_default_currency() ) {
			$base_price = WC_Bookings_Cost_Calculation::calculated_base_cost( $product );
			if ( 'incl' === get_option( 'woocommerce_tax_display_shop' ) ) {
				if ( function_exists( 'wc_get_price_excluding_tax' ) ) {
					$display_price = wc_get_price_including_tax( $product, array(
						'qty'   => 1,
						'price' => $base_price,
					) );
				} else {
					$display_price = $product->get_price_including_tax( 1, $base_price );
				}
			} else {
				if ( function_exists( 'wc_get_price_excluding_tax' ) ) {
					$display_price = wc_get_price_excluding_tax( $product, array(
						'qty'   => 1,
						'price' => $base_price,
					) );
				} else {
					$display_price = $product->get_price_excluding_tax( 1, $base_price );
				}
			}
			remove_filter( 'woocommerce_product_get_price', array( $this, 'woocommerce_product_get_price' ), 99 );
			$display_price_suffix_comp  = wc_price( apply_filters( 'woocommerce_product_get_price', $display_price, $product ) ) . $product->get_price_suffix();
			$original_price_suffix_comp = wc_price( $display_price ) . $product->get_price_suffix();
			add_filter( 'woocommerce_product_get_price', array( $this, 'woocommerce_product_get_price' ), 99, 2 );
			$original_price_suffix = wc_price( $display_price ) . $product->get_price_suffix();
			$display_price         = apply_filters( 'woocommerce_product_get_price', $display_price, $product );
			$display_price_suffix  = wc_price( $display_price ) . $product->get_price_suffix();

			if ( $original_price_suffix_comp !== $display_price_suffix_comp ) {
				$price_html = "<del>{$original_price_suffix}</del><ins>{$display_price_suffix}</ins>";
			} elseif ( $display_price ) {
				if ( $product->has_additional_costs() || $product->get_display_cost() ) {
					/* translators: 1: display price */
					$price_html = sprintf( esc_html__( 'From: %s', 'woocommerce-bookings' ), wc_price( $display_price ) ) . $product->get_price_suffix();
				} else {
					$price_html = wc_price( $display_price ) . $product->get_price_suffix();
				}
			} elseif ( ! $product->has_additional_costs() ) {
				$price_html = esc_html__( 'Free', 'woocommerce-bookings' );
			} else {
				$price_html = '';
			}
		}

		return $price_html;
	}

	public function add_price_switcher() {
		if ( is_product() ) {
			echo do_shortcode( '[woo_multi_currency_product_price_switcher]' );
		}
	}

	public function price_collate_single() {
		if ( is_product() ) {
			global $product;
			if ( ! isset( $product ) || empty( $product ) ) {
				return;
			}
			$product_price = $product->get_price();
			echo do_shortcode( '[woo_multi_currency_product_collate layout="' . esc_attr( self::$settings->get_param('price_collate_layout') ) .
			                   '" price_convert=' . esc_attr( $product_price ) . ' title="' . self::$settings->get_param( 'price_collate_title' ) . '"]' );
		}
	}

	public function price_collate_after_title() {
		global $product;
		if ( ! isset( $product ) || empty( $product ) ) {
			return;
		}
		self::render_collate_price_archive( $product );
	}

	public function price_collate_before_template_loop( $template_name ) {
		if ( ! in_array( $template_name,
			array(
				'loop/price.php',
				'loop/sale-flash.php',
			) ) ) {
			return;
		}
		switch ( self::$settings->get_param( 'price_collate_archive' ) ) {
			case 'before_sale_flash':
				if ( $template_name !== 'loop/sale-flash.php' ) {
					return;
				}
				break;
			case 'before_price':
				if ( $template_name !== 'loop/price.php' ) {
					return;
				}
				break;
			default:
				return;
		}
		global $product;
		if ( ! isset( $product ) || empty( $product ) ) {
			return;
		}
		self::render_collate_price_archive( $product );
	}

	public function price_collate_after_template_loop( $template_name ) {
		if ( ! in_array( $template_name,
			array(
				'loop/price.php',
				'loop/sale-flash.php',
			) ) ) {
			return;
		}
		switch ( self::$settings->get_param( 'price_collate_archive' ) ) {
			case 'after_sale_flash':
				if ( $template_name !== 'loop/sale-flash.php' ) {
					return;
				}
				break;
			case 'after_price':
				if ( $template_name !== 'loop/price.php' ) {
					return;
				}
				break;
			default:
				return;
		}
		global $product;
		if ( ! isset( $product ) || empty( $product ) ) {
			return;
		}
		self::render_collate_price_archive( $product );
	}

	public function render_collate_price_archive( $product ) {
		$product_price = $product->get_price();
		$range_price   = '';

		if ( $product->get_type() == 'variable' ) {
			$prices = $product->get_variation_prices( true );
			if ( ! empty( $prices ) && is_array( $prices ) && ! empty( $prices['price'] ) ) {
				$min_price     = current( $prices['price'] );
				$max_price     = end( $prices['price'] );
				$min_reg_price = current( $prices['regular_price'] );
				$max_reg_price = end( $prices['regular_price'] );

				if ( $min_price !== $max_price ) {
					$range_price = $min_price . '|' . $max_price;
				} elseif ( $product->is_on_sale() && $min_reg_price === $max_reg_price ) {
					$product_price = $min_price;
				} else {
					$product_price = $min_price;
				}
			}
		}

		echo do_shortcode( '[woo_multi_currency_product_collate layout="' . esc_attr( self::$settings->get_param('price_collate_layout') ) .
		                   '" price_convert=' . esc_attr( $product_price ) . ' price_range="' . esc_attr( $range_price ) .
		                   '" title="' . self::$settings->get_param( 'price_collate_title' ) . '" class="wmc-collate-archive-page"]' );
	}

	/**
	 * @param $product WC_Product_Variable|WC_Product
	 * @param bool $currency_code
	 * @param bool $raw
	 *
	 * @return float|int|mixed|string
	 */
	public static function get_variation_max_price( $product, $currency_code = false, $raw = false ) {
		$variation_ids     = $product->get_visible_children();
		$price_max         = 0;
		$check_fixed_price = self::$settings->check_fixed_price();
		foreach ( $variation_ids as $variation_id ) {
			$variation = wc_get_product( $variation_id );

			if ( $variation ) {
				$price = 0;
				if ( ! $currency_code ) {
					$current_currency = self::$settings->get_current_currency();
				} elseif ( ! $raw ) {
					$current_currency = $currency_code;
				}

				if ( $check_fixed_price && ! $raw ) {
					$fixed_price = self::get_fixed_price( $variation, $current_currency );
					if ( $fixed_price !== false || self::$settings->get_params( 'ignore_exchange_rate' ) ) {
						$price = $fixed_price;
					}
				}


				if ( ! $price && ! ( $check_fixed_price && self::$settings->get_params( 'ignore_exchange_rate' ) ) ) {
					$price = $variation->get_price( 'edit' );
					if ( ! $raw ) {
						$price = wmc_get_price( $price, $currency_code );
					}
				}

				if ( $price > $price_max ) {
					$price_max = $price;
				}
			}
		}

		return apply_filters( 'wmc_get_variation_max_price', $price_max, $product, $currency_code, $raw );
	}

	/**
	 * @param $product WC_Product|WC_Product_Variable
	 * @param bool $currency_code
	 * @param bool $raw
	 *
	 * @return bool|float|int|mixed|string
	 */
	public static function get_variation_min_price( $product, $currency_code = false, $raw = false ) {
		$variation_ids     = $product->get_visible_children();
		$price_min         = false;
		$check_fixed_price = self::$settings->check_fixed_price();
		foreach ( $variation_ids as $variation_id ) {
			$variation = wc_get_product( $variation_id );

			if ( $variation ) {
				$price = 0;

				if ( ! $currency_code ) {
					$current_currency = self::$settings->get_current_currency();
				} elseif ( ! $raw ) {
					$current_currency = $currency_code;
				}

				if ( $check_fixed_price && ! $raw ) {
					$fixed_price = self::get_fixed_price( $variation, $current_currency );
					if ( $fixed_price !== false || self::$settings->get_params( 'ignore_exchange_rate' ) ) {
						$price = $fixed_price;
					}
				}

				if ( ! $price && ! ( $check_fixed_price && self::$settings->get_params( 'ignore_exchange_rate' ) ) ) {

					$price = $variation->get_price( 'edit' );
					if ( ! $raw ) {
						$price = wmc_get_price( $price, $currency_code );
					}
				}

				if ( $price_min === false ) {
					$price_min = $price;
				}

				if ( $price < $price_min ) {
					$price_min = $price;
				}
			}
		}

		return $price_min;
	}

	/**
	 *
	 */
	public function prepare_params() {
		if ( self::$settings->get_auto_detect() != 2 ) {
			return;
		}

		if ( ! self::$settings->getcookie( 'wmc_currency_rate' ) || ! self::$settings->getcookie( 'wmc_currency_symbol' ) || ! self::$settings->getcookie( 'wmc_ip_info' ) ) {
			return;
		}

		$this->show_approximate_price = true;
		$geoplugin_arg                = json_decode( base64_decode( self::$settings->getcookie( 'wmc_ip_info' ) ), true );
		$detect_currency_code         = isset( $geoplugin_arg['currency_code'] ) ? $geoplugin_arg['currency_code'] : '';
		$country_code                 = isset( $geoplugin_arg['country'] ) ? $geoplugin_arg['country'] : '';
		$currencies                   = self::$settings->get_currencies();

		if ( apply_filters( 'wmc_approximate_price_currency_by_country', self::$settings->get_enable_currency_by_country() ) ) {
			foreach ( $currencies as $currency ) {
				$data = self::$settings->get_currency_by_countries( $currency );
				if ( in_array( $country_code, $data ) ) {
					$detect_currency_code = $currency;
					break;
				}
			}
		}

		if ( $detect_currency_code == self::$settings->get_current_currency() ) {
			return;
		}

		$list_currencies  = self::$settings->get_list_currencies();
		$default_currency = self::$settings->get_default_currency();
		if ( $detect_currency_code && isset( $list_currencies[ $detect_currency_code ] ) ) {
			$decimals    = (int) $list_currencies[ $detect_currency_code ]['decimals'];
			$current_pos = $list_currencies[ $detect_currency_code ]['pos'];
		} else {
			$decimals    = (int) $list_currencies[ $default_currency ]['decimals'];
			$current_pos = $list_currencies[ $default_currency ]['pos'];
		}
		$format = '';
		switch ( $current_pos ) {
			case 'left' :
				$format = '%1$s%2$s';
				break;
			case 'right' :
				$format = '%2$s%1$s';
				break;
			case 'left_space' :
				$format = '%1$s&nbsp;%2$s';
				break;
			case 'right_space' :
				$format = '%2$s&nbsp;%1$s';
				break;
		}

		$this->prepare_param = array(
			'rate'               => self::$settings->getcookie( 'wmc_currency_rate' ),
			'symbol'             => self::$settings->getcookie( 'wmc_currency_symbol' ),
			'format'             => $format,
			'decimals'           => $decimals,
			'decimal_separator'  => wc_get_price_decimal_separator(),
			'thousand_separator' => wc_get_price_thousand_separator(),
			'priority'           => self::$settings->get_param( 'approximately_priority' ),
			'currency_code'      => $detect_currency_code
		);

		/*not work for variable product whose variations have the same price*/
		add_filter( 'woocommerce_get_price_html', array( $this, 'add_approximately_price' ), 20, 2 );

		add_filter( 'woocommerce_cart_product_price', array( $this, 'cart_product_approximately_price' ), 20, 2 );
		add_filter( 'woocommerce_cart_totals_order_total_html', array( $this, 'cart_total_approximately_price' ), 30 );
		add_filter( 'woocommerce_cart_subtotal', array( $this, 'cart_subtotal_approximately_price' ), 20, 3 );
		add_filter( 'woocommerce_cart_product_subtotal', array(
			$this,
			'cart_product_subtotal_approximately_price'
		), 20, 4 );
		add_filter( 'woocommerce_cart_shipping_method_full_label', array(
			$this,
			'shipping_approximately_price'
		), 20, 2 );
		add_filter( 'woocommerce_get_formatted_order_total', array(
			$this,
			'woocommerce_get_formatted_order_total'
		), 20, 2 );
		add_filter( 'woocommerce_cart_totals_taxes_total_html', array( $this, 'cart_totals_taxes_total_html' ), 20, 2 );
	}

	/**
	 * @param $html_price
	 * @param $product WC_Product
	 *
	 * @return string
	 */
	public function add_approximately_price( $html_price, $product ) {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return $html_price;
		}
		if ( self::$settings->get_auto_detect() == 2 ) {

			if ( '' === $product->get_price() || empty( $this->prepare_param ) ) { // || ! $product->is_in_stock()
				return $html_price;
			}

			$params          = $this->prepare_param;
			$raw_price       = wc_get_price_to_display( $product, array(
				'qty'   => 1,
				'price' => $product->get_price( 'edit' )
			) );
			$price           = number_format( apply_filters( 'wmc_get_price', $raw_price * $params['rate'], $params['currency_code'] ), (int) $params['decimals'], $params['decimal_separator'], $params['thousand_separator'] );
			$pos             = strpos( $params['symbol'], '#PRICE#' );
			$formatted_price = $pos ? str_replace( '#PRICE#', $price, $params['symbol'] ) : sprintf( $params['format'], $params['symbol'], $price );

			$max_price = '';
			if ( $product->get_type() == 'variable' ) {
				$price_max = self::get_variation_max_price( $product, false, true );
				if ( $price_max != $product->get_price( 'edit' ) ) {
					$raw_price = wc_get_price_to_display( $product, array( 'qty' => 1, 'price' => $price_max ) );
					$price_max = number_format( apply_filters( 'wmc_get_price', $raw_price * $params['rate'], $params['currency_code'] ), (int) $params['decimals'], $params['decimal_separator'], $params['thousand_separator'] );
					$max_price = $pos ? str_replace( '#PRICE#', $price_max, $params['symbol'] ) : sprintf( $params['format'], $params['symbol'], $price_max );
					$max_price = ' - ' . $max_price;
				}
			}

			$appro_label = self::$settings->get_param( 'approximately_label' );
			$pos         = strpos( $appro_label, '{price}' );
			$appro_price = $pos ? str_replace( '{price}', $formatted_price . $max_price, $appro_label ) : $appro_label . $formatted_price . $max_price;

			$html_price = $params['priority'] ? '<span class="wmc-approximately">' . $appro_price . '</span>' . $html_price : $html_price . '<span class="wmc-approximately">' . $appro_price . '</span>';

		}

		return $html_price;
	}

	/**
	 * @param $html
	 *
	 * @return string
	 */
	public function cart_total_approximately_price( $html ) {
		if ( ! $this->show_approximate_price || ! in_array( 'total', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $html;
		}

		$total_price = wc()->cart->get_total( 'edit' );
		$appro_price = $this->get_approximately_price( floatval( $total_price ) );

		return self::$settings->get_param( 'approximately_priority' ) ? $appro_price . $html : $html . $appro_price;
	}

	/**
	 * @param $cart_subtotal
	 * @param $compound
	 * @param $cart WC_Cart
	 *
	 * @return string
	 */
	public function cart_subtotal_approximately_price( $cart_subtotal, $compound, $cart ) {
		if ( ! $this->show_approximate_price || ! in_array( 'subtotal', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $cart_subtotal;
		}

		if ( $compound ) {
			$subtotal_price = $cart->get_cart_contents_total() + $cart->get_shipping_total() + $cart->get_taxes_total( false, false );
		} elseif ( $cart->display_prices_including_tax() ) {
			$subtotal_price = $cart->get_subtotal() + $cart->get_subtotal_tax();
		} else {
			$subtotal_price = $cart->get_subtotal();
		}

		$appro_price = $this->get_approximately_price( $subtotal_price );

		return $this->prepare_param['priority'] ? $appro_price . $cart_subtotal : $cart_subtotal . $appro_price;
	}

	public function cart_product_approximately_price( $product_price, $product ) {
		if ( ! $this->show_approximate_price || ! in_array( 'product', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $product_price;
		}
		if ( wc()->cart->display_prices_including_tax() ) {
			$item_price = wc_get_price_including_tax( $product );
		} else {
			$item_price = wc_get_price_excluding_tax( $product );
		}
		$appro_price = $this->get_approximately_price( $item_price );

		return $this->prepare_param['priority'] ? $appro_price . $product_price : $product_price . $appro_price;
	}

	/**
	 * @param $product_subtotal
	 * @param $product WC_Product
	 * @param $quantity
	 * @param $cart WC_Cart
	 *
	 * @return string
	 */
	public function cart_product_subtotal_approximately_price( $product_subtotal, $product, $quantity, $cart ) {
		if ( ! $this->show_approximate_price || ! in_array( 'product_subtotal', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $product_subtotal;
		}
		$price = $product->get_price();

		if ( $product->is_taxable() ) {
			if ( $cart->display_prices_including_tax() ) {
				$row_price = wc_get_price_including_tax( $product, array( 'qty' => $quantity ) );
			} else {
				$row_price = wc_get_price_excluding_tax( $product, array( 'qty' => $quantity ) );
			}
		} else {
			$row_price = $price * $quantity;
		}

		$appro_price = $this->get_approximately_price( $row_price );

		return $this->prepare_param['priority'] ? $appro_price . $product_subtotal : $product_subtotal . $appro_price;
	}

	/**
	 * @param $label
	 * @param $method WC_Shipping_Rate
	 *
	 * @return string
	 */
	public function shipping_approximately_price( $label, $method ) {
		if ( ! $this->show_approximate_price || ! in_array( 'shipping', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $label;
		}
		$has_cost  = 0 < $method->cost;
		$hide_cost = ! $has_cost && in_array( $method->get_method_id(), array(
				'free_shipping',
				'local_pickup'
			), true );
		$raw_price = '';
		if ( $has_cost && ! $hide_cost ) {
			if ( WC()->cart->display_prices_including_tax() ) {
				$raw_price = $method->cost + $method->get_shipping_tax();
			} else {
				$raw_price = $method->cost;
			}
		}
		$appro_price = $this->get_approximately_price( $raw_price );

		return $this->prepare_param['priority'] ? $appro_price . $label : $label . $appro_price;
	}

	/**
	 * @param $formatted_total
	 * @param $order WC_Order
	 *
	 * @return string
	 */
	public function woocommerce_get_formatted_order_total( $formatted_total, $order ) {
		if ( ! $order ) {
			return $formatted_total;
		}
		if ( $this->show_approximate_price && in_array( 'total_thankyou', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			$order_currency = $order->get_currency();
			if ( $order_currency ) {
				$appro_price = $this->get_approximately_price( $order->get_total(), $order_currency );
			} else {
				$appro_price = $this->get_approximately_price( $order->get_total() );
			}

			$formatted_total = self::$settings->get_param( 'approximately_priority' ) ? $appro_price . $formatted_total : $formatted_total . $appro_price;
		} elseif ( is_order_received_page() && self::$settings->get_params( 'equivalent_currency' ) ) {
//			$current_currency = self::$settings->get_current_currency();
//			$order_currency   = $order->get_currency();
//			if ( self::$settings->get_current_currency() !== $order_currency ) {
//				$total = $order->get_total();
//				$total = wmc_revert_price( $total, $order_currency );
//				if ( self::$settings->get_default_currency() !== $current_currency ) {
//					$total = wmc_get_price( $total );
//				}
//				$formatted_total = $formatted_total . '(' . wc_price( $total, array( 'currency' => $current_currency ) ) . ')';
//			}
		}

		return $formatted_total;
	}

	public function cart_totals_taxes_total_html( $html ) {
		if ( ! $this->show_approximate_price || ! in_array( 'tax', (array) self::$settings->get_param( 'approximate_position' ) ) ) {
			return $html;
		}

		$taxes       = WC()->cart->get_taxes_total();
		$appro_taxes = wp_kses_post( $this->get_approximately_price( $taxes ) );

		return $this->prepare_param['priority'] ? $appro_taxes . $html : $html . $appro_taxes;
	}

	public function get_approximately_price( $raw_price, $order_currency = '' ) {
		if ( empty( $this->prepare_param ) || ! $raw_price ) {
			return '';
		}
		$raw_price = $order_currency ? wmc_revert_price( $raw_price, $order_currency ) : wmc_revert_price( $raw_price );
		$params    = $this->prepare_param;
		$price     = number_format( $raw_price * $params['rate'], (int) $params['decimals'], $params['decimal_separator'], $params['thousand_separator'] );

		$pos             = strpos( $params['symbol'], '#PRICE#' );
		$formatted_price = $pos ? str_replace( '#PRICE#', $price, $params['symbol'] ) : sprintf( $params['format'], $params['symbol'], $price );

		$appro_label = self::$settings->get_param( 'approximately_label' );
		$pos         = strpos( $appro_label, '{price}' );
		$appro_price = $pos ? str_replace( '{price}', $formatted_price, $appro_label ) : $appro_label . $formatted_price;

		$html_price = '<div class="wmc-approximately">' . $appro_price . '</div>';

		return $html_price;
	}

	//Check request from admin
	function is_direct_checkout_rest() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return false;
		}
		$prefix = rest_get_url_prefix();
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST
		     || isset( $_GET['rest_route'] )
		        && strpos( trim( $_GET['rest_route'], '\\/' ), $prefix, 0 ) === 0 ) {
			return true;
		}

		global $wp_rewrite;
		if ( $wp_rewrite === null ) {
			$wp_rewrite = new WP_Rewrite();
		}

		$rest_url    = wp_parse_url( trailingslashit( rest_url() ) );
		$current_url = wp_parse_url( add_query_arg( array() ) );

		return strpos( $current_url['path'], $rest_url['path'], 0 ) === 0;
	}

	/**
	 * Check on checkout page
	 */

	public function init() {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return;
		}

		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}

		if ( is_plugin_active( 'woocommerce-direct-checkout/woocommerce-direct-checkout.php' ) ) {
			//This plugin set all page as checkout page (include admin)
			if ( isset( $GLOBALS['current_screen'] ) || is_customize_preview() ) {
				return;
			}

			$drco_admin_url     = strtolower( admin_url() );
			$requestFromBackend = self::is_direct_checkout_rest() && strpos( $drco_admin_url, '/wp-admin/' ) > 0 && ! strpos( $drco_admin_url, '/wp-admin/admin-ajax.php' );
			if ( $requestFromBackend ) {
				return;
			}
		}

		/*Fix UX Builder of Flatsome*/
		if ( isset( $_GET['uxb_iframe'] ) ) {
			return;
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return;
		}

		$is_cart     = $this->is_cart();
		$is_checkout = $this->is_checkout();
		if ( ! ( wp_doing_ajax() && isset( $_POST['action'] ) && $_POST['action'] == 'wmc_get_products_price' || ! wp_doing_ajax() ) ) {
			return;
		}

		$allow_multi = self::$settings->get_enable_multi_payment();

		$current_currency       = self::$settings->get_current_currency();
		$checkout_currency      = self::$settings->get_checkout_currency();
		$checkout_currency_args = self::$settings->get_checkout_currency_args();
		$old_currency           = self::$settings->getcookie( 'wmc_current_currency_old' );

		if ( in_array( $current_currency, $checkout_currency_args ) ) {
			$checkout_currency = $current_currency;
		}

		/*Checkout && Cartpage*/
		if ( ! $allow_multi ) {
			if ( $is_checkout ) {
				self::$settings->set_current_currency( self::$settings->get_default_currency(), false );
			} elseif ( self::$settings->enable_cart_page() && $is_cart ) {
				self::$settings->set_current_currency( $checkout_currency, false );
			} elseif ( $old_currency && $old_currency != $current_currency ) {
				self::$settings->set_current_currency( $old_currency, false );
			}
		} else {
			if ( ! isset( $_REQUEST['custom-page'] ) ) { //check ! isset( $_REQUEST['custom-page'] ) to fix looping checkout error with theme Handmade
				if ( $allow_multi && $is_checkout ) { // is checkout page
					self::$settings->set_current_currency( $checkout_currency, false );
				} elseif ( self::$settings->enable_cart_page() && $is_cart ) {
					self::$settings->set_current_currency( $checkout_currency, false );
				} elseif ( $old_currency && $old_currency != $current_currency ) {
					self::$settings->set_current_currency( $old_currency, false );
				}
			}
		}

		/*need testing more*/
		if ( ! WOOMULTI_CURRENCY_Data::is_request_to_rest_api() ) {
			$list_currencies  = self::$settings->get_list_currencies();
			$current_currency = self::$settings->get_current_currency();
			$need_update      = false;
			if ( ! empty( $list_currencies[ $current_currency ] ) ) {
				if ( $list_currencies[ $current_currency ]['hide'] === '1' ) {
					$need_update = true;
				}
			} else {
				$need_update = true;
			}
			if ( $need_update ) {
				self::$settings->set_fallback_currency();
			}
		}

		do_action( 'wmc_after_init_currency', self::$settings, $is_cart, $is_checkout, $this );
	}

	public function get_current_url() {
		global $wp;
		$current_url = site_url( add_query_arg( array(), $wp->request ) );

		$redirect_url = isset( $_SERVER['REDIRECT_URI'] ) ? $_SERVER['REDIRECT_URI'] : '';
		$redirect_url = ! empty( $_SERVER['REDIRECT_URL'] ) ? $_SERVER['REDIRECT_URL'] : $redirect_url;
		$redirect_url = ! empty( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : $redirect_url;

		return $current_url . $redirect_url;
	}

	public function get_post_from_url() {
		if ( is_plugin_active( 'learnpress/learnpress.php' ) ) {
			return [];
		}
		$current_url = $this->get_current_url();
		if ( class_exists( 'SitePress' ) ) {
			global $sitepress;
			remove_filter( 'url_to_postid', array( $sitepress, 'url_to_postid' ) );
			$id = url_to_postid( $current_url );
			add_filter( 'url_to_postid', array( $sitepress, 'url_to_postid' ) );
		} else {
			$id = url_to_postid( $current_url );
		}

		$post = get_post( $id );

		return $post;
	}

	public function has_shortcode( $post, $tag ) {
		return is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, $tag );
	}

	public function is_cart() {
		if ( class_exists( 'Polylang' ) && function_exists( 'is_cart' ) ) {
			return is_cart();
		} else {
			return $this->has_shortcode( $this->get_post_from_url(), 'woocommerce_cart' ) || strpos( $this->get_current_url(), wc_get_cart_url() ) !== false || Constants::is_defined( 'WOOCOMMERCE_CART' );
		}
	}

	public function is_checkout() {
		if ( class_exists( 'Polylang' ) && function_exists( 'is_checkout' ) ) {
			return is_checkout();
		} else {
			$get_current_url  = $this->get_current_url();
			$get_checkout_url = wc_get_checkout_url();
			if ( ! empty( $get_current_url ) && ! empty( $get_checkout_url ) ) {
				$check_pos_url = strpos( $get_current_url, $get_checkout_url );
			} else {
				$check_pos_url = false;
			}

			return $this->has_shortcode( $this->get_post_from_url(), 'woocommerce_checkout' ) || $check_pos_url !== false || Constants::is_defined( 'WOOCOMMERCE_CHECKOUT' ) || apply_filters( 'woocommerce_is_checkout', false );
		}
	}

	/**
	 * Variable Parent min max price
	 *
	 * @param $price_arr
	 *
	 * @return array
	 */
	public function get_woocommerce_variation_prices( $price_arr, $product, $for_display ) {
		$current_currency = self::$settings->get_current_currency();

		$temp_arr = $price_arr;
		if ( is_array( $price_arr ) && ! empty( $price_arr ) ) {
			$check_fixed_price = self::$settings->check_fixed_price();
			$ignore_exchange   = self::$settings->get_params( 'ignore_exchange_rate' );
			foreach ( $price_arr as $price_type => $values ) {
				foreach ( $values as $key => $value ) {
					if ( $check_fixed_price ) {

						if ( $temp_arr['regular_price'][ $key ] != $temp_arr['price'][ $key ] ) {
							if ( $price_type == 'regular_price' ) {
								$fixed_price = self::get_fixed_price( wc_get_product( $key ), $current_currency, 'regular_price' );

								if ( $fixed_price !== false || $ignore_exchange ) {
									$price_arr[ $price_type ][ $key ] = $for_display ? $this->tax_handle( $fixed_price, $product ) : $fixed_price;
								} else {
									$price_arr[ $price_type ][ $key ] = wmc_get_price( $value );
								}
							}

							if ( $price_type == 'price' || $price_type == 'sale_price' ) {
								$fixed_price = self::get_fixed_price( wc_get_product( $key ), $current_currency, 'sale_price' );

								if ( $fixed_price !== false || $ignore_exchange ) {
									$price_arr[ $price_type ][ $key ] = $for_display ? $this->tax_handle( $fixed_price, $product ) : $fixed_price;
								} else {
									$price_arr[ $price_type ][ $key ] = wmc_get_price( $value );
								}
							}
						} else {
							$fixed_price = self::get_fixed_price( wc_get_product( $key ), $current_currency, 'regular_price' );
							if ( $fixed_price !== false || $ignore_exchange ) {
								$price_arr[ $price_type ][ $key ] = $for_display ? $this->tax_handle( $fixed_price, $product ) : $fixed_price;
							} else {
								$price_arr[ $price_type ][ $key ] = wmc_get_price( $value );
							}
						}

					} else {
						$price_arr[ $price_type ][ $key ] = wmc_get_price( $value );
					}
				}
			}
		}

		return $price_arr;
	}

	public function tax_handle( $price, $product ) {
		if ( ! $price ) {
			return $price;
		}

		$data = array( 'qty' => 1, 'price' => $price, );

		return 'incl' === get_option( 'woocommerce_tax_display_shop' ) ? wc_get_price_including_tax( $product, $data ) : wc_get_price_excluding_tax( $product, $data );
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_variation_get_sale_price( $price, $product ) {
		if ( ! $price ) {
			return $price;
		}

		$product_id = $product->get_id();
		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}
		$changes = $product->get_changes();

		if ( self::$settings->check_fixed_price() && ( is_array( $changes ) ) && count( $changes ) < 1 ) {

			$current_currency = self::$settings->get_current_currency();
			$fixed_price      = self::get_fixed_price( $product, $current_currency, 'sale_price' );
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}

		return $this->set_cache( wmc_get_price( $price ), $product_id, $price );
		//Do nothing to remove prices hash to always get live price.
	}

	/**
	 * Set price to global. It will help more speedy.
	 *
	 * @param $price
	 * @param $id
	 * @param $key
	 *
	 * @return float
	 */
	protected function set_cache( $price, $id, $key ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return $price;
		}
		$ajax = isset( $_GET['wc-ajax'] ) ? sanitize_text_field( $_GET['wc-ajax'] ) : '';
		if ( $ajax === 'ppc-create-order' ) {
			/**
			 * Fix bug with WooCommerce PayPal Payments
			 *
			 * 'HUF', 'JPY' and 'TWD' do not support decimals, the rest must have 2 decimals
			 */
			$current_currency = self::$settings->get_current_currency();
			$args             = array( 'decimals' => 2 );
			if ( in_array( $current_currency, array( 'HUF', 'JPY', 'TWD' ) ) ) {
				$args['decimals'] = 0;
			}
			$price = WOOMULTI_CURRENCY_Data::convert_price_to_float( $price, $args );
		} else {
//			$current_currency = self::$settings->get_current_currency();
//			$list_currencies  = self::$settings->get_list_currencies();
//			if ( isset( $list_currencies[ $current_currency ]['decimals'] ) ) {
//				$price = WOOMULTI_CURRENCY_Data::convert_price_to_float( $price, array( 'decimals' => absint( $list_currencies[ $current_currency ]['decimals'] ) ) );
//			}
		}

		if ( $price && $id && $key ) {
			/*Default decimal is "."*/
			$this->price[ $id ][ $key ] = str_replace( ',', '.', $price );

			return $this->price[ $id ][ $key ];
		} else {
			return $price === false ? '' : $price;
		}
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_variation_get_regular_price( $price, $product ) {
		if ( ! $price ) {
			return $price;
		}
		$product_id = $product->get_id();
		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}
		$changes = $product->get_changes();

		if ( self::$settings->check_fixed_price() && ( is_array( $changes ) ) && count( $changes ) < 1 ) {

			$current_currency = self::$settings->get_current_currency();
			$fixed_price      = self::get_fixed_price( $product, $current_currency, 'regular_price' );
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}
		do_action( 'wmc_before_convert_regular_price', $product, $price );
		$price = $this->set_cache( wmc_get_price( $price ), $product_id, $price );
		do_action( 'wmc_after_convert_regular_price', $product, $price );

		return $price;
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_variation_get_price( $price, $product ) {
		if ( ( $this->is_cart() || $this->is_checkout() ) &&
		     is_plugin_active( 'woocommerce-wholesale-prices-premium/woocommerce-wholesale-prices-premium.bootstrap.php' ) ) {
			$ws_p_data = $product->get_data();
			if ( $ws_p_data && is_array( $ws_p_data ) && isset( $ws_p_data['sale_price'] ) && ! empty( $ws_p_data['sale_price'] ) && floatval( $ws_p_data['sale_price'] ) != $price ) {
				return $price;
			}
		}
		if ( ! $price ) {
			return $price;
		}
		$product_id = $product->get_id();

		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}

		$changes = $product->get_changes();

		if ( self::$settings->check_fixed_price() && ( is_array( $changes ) ) && count( $changes ) < 1 ) {

			$current_currency = self::$settings->get_current_currency();
			$fixed_price      = self::get_fixed_price( $product, $current_currency );
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}
		if ( is_plugin_active( 'woocommerce-tm-extra-product-options/tm-woo-extra-product-options.php' ) && self::$settings->check_fixed_price() && ! empty( $changes ) ) {
			return $this->set_cache( $price, $product_id, $price );
		}
		if ( is_plugin_active( 'wc-fields-factory/wcff.php' ) && is_array( $changes ) && count( $changes ) ) {
			return $this->set_cache( $price, $product_id, $price );
		}


		return $this->set_cache( wmc_get_price( $price ), $product_id, $price );
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_get_price( $price, $product ) {
//		echo '<pre>' . print_r('woocommerce_product_get_price', true) . '</pre>';
//		echo '<pre>' . print_r($price, true) . '</pre>';
		$condition = apply_filters( 'wmc_product_get_price_condition', true, $price, $product );
		if ( ! $price || ! $condition ) {
			return $price;
		}
		$product_id = $product->get_id();
//echo '<pre>' . print_r(11111111, true) . '</pre>';
//echo '<pre>' . print_r($this->price[ $product_id ], true) . '</pre>';
		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}
//echo '<pre>' . print_r(22222222222, true) . '</pre>';
		$changes          = $product->get_changes();
		$no_fixed_changes = is_array( $changes ) ? count( $changes ) < 1 : false;
		if ( is_plugin_active( 'advanced-dynamic-pricing-for-woocommerce/advanced-dynamic-pricing-for-woocommerce.php' ) ) {
			if ( is_array( $changes ) && array_key_exists( 'adpCustomInitialPrice', $changes ) && count( $changes ) < 2 ) {
				$no_fixed_changes = true;
			}
		}
		if ( is_plugin_active( 'eventON/eventon.php' ) && is_plugin_active( 'eventon-tickets/eventon-tickets.php' ) && is_plugin_active( 'advanced-custom-fields-pro/acf.php' ) ) {
			if ( is_array( $changes ) && array_key_exists( 'name', $changes ) && count( $changes ) < 2 ) {
				$no_fixed_changes = true;
			}
		}
//		echo '<pre>' . print_r($changes, true) . '</pre>';
		if ( is_array( $changes ) && array_key_exists( 'tax_class', $changes ) && count( $changes ) < 2 ) {
			$no_fixed_changes = true;
		}
		if ( is_plugin_active('woo-custom-product-addons-pro/start.php' ) && wp_doing_ajax() && is_array( $changes ) && array_key_exists( 'weight', $changes ) && count( $changes ) < 2 ) {
			$no_fixed_changes = true;
		}
		if ( self::$settings->check_fixed_price() && $no_fixed_changes ) {
//			echo '<pre>' . print_r(666666666, true) . '</pre>';
			$current_currency = self::$settings->get_current_currency();
			if ( $product->get_type() === 'variable' ) {

				$children = $product->get_visible_children();
				$prices   = [];
				if ( ! empty( $children ) ) {
					foreach ( $children as $child_id ) {
						$variation = wc_get_product( $child_id );
						$f_price   = self::get_fixed_price( $variation, $current_currency );
						$prices[]  = $f_price;
					}
				}
				if ( empty( $prices ) && 0 == count( $prices ) ) {
					$prices[] = 0;
				}
				$fixed_price = min( $prices );

			} else {
				$fixed_price = self::get_fixed_price( $product, $current_currency );
				//Fixed price discount for bundle, not working with variable product
				//Error return 0 with normal product
//				if ( is_plugin_active( 'woocommerce-product-bundles/woocommerce-product-bundles.php' ) ) {
//					$min_price_meta = get_post_meta( $product_id, '_price', false );
//					$min_price_meta = reset( $min_price_meta );
//					$fixed_price = ( $price * $fixed_price ) / $min_price_meta;
//				}
			}
//			echo '<pre>' . print_r('setttttt', true) . '</pre>';
//			echo '<pre>' . print_r($fixed_price, true) . '</pre>';
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
//				echo '<pre>' . print_r(7777777777, true) . '</pre>';
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}
//echo '<pre>' . print_r(333333333, true) . '</pre>';
		if ( is_plugin_active( 'woocommerce-tm-extra-product-options/tm-woo-extra-product-options.php' ) && self::$settings->check_fixed_price() ) {
			if ( is_plugin_active( 'woo-discount-rules/woo-discount-rules.php' ) ) {
				if ( ( $this->is_cart() || $this->is_checkout() ) ) {
					$new_price = apply_filters( 'wmc_wc_product_get_price', wmc_get_price( $price ) );
				} else {
					$new_price = $price;
				}
			} else {
//				echo '<pre>' . print_r('12121212121212121212', true) . '</pre>';
				if ( defined( 'THEMECOMPLETE_EPO_VERSION' ) && version_compare( THEMECOMPLETE_EPO_VERSION, '7.1', '>=' ) && version_compare( THEMECOMPLETE_EPO_VERSION, '7.4', '<' ) ) {
					$new_price = apply_filters( 'wmc_wc_product_get_price', $price );
				} else {
//					echo '<pre>' . print_r('1313131313131313131313', true) . '</pre>';
					$new_price = apply_filters( 'wmc_wc_product_get_price', wmc_get_price( $price ) );
				}
			}
		} else {
			if ( is_array( $changes ) && count( $changes ) > 0 ) {
//				echo '<pre>' . print_r(888888888, true) . '</pre>';
				if ( function_exists( 'beeplug_ucdp_beePluginTables' ) || is_plugin_active( 'wc-fields-factory/wcff.php' ) ||
				     is_plugin_active( 'funnel-builder-pro/funnel-builder-pro.php' ) ) {
//					echo '<pre>' . print_r('aaaaaaaaa', true) . '</pre>';
					if ( is_array( $changes ) && array_key_exists( 'price', $changes ) && count( $changes ) < 2 && self::$settings->get_param( 'beauty_price_enable' ) ) {
						$new_price = wmc_get_price( $price );
					} else {
						$new_price = $price;
					}
				}
				elseif ( is_plugin_active( 'woocommerce-tm-extra-product-options/tm-woo-extra-product-options.php' ) ) {
//					echo '<pre>' . print_r('bbbbbbbbbbbbbb', true) . '</pre>';
					$new_price = apply_filters( 'wmc_wc_product_get_price', wmc_get_price( $price ) );
					if ( isset( $this->price[ $product_id ] ) && is_array( $this->price[ $product_id ] ) ) {
						foreach ( $this->price[ $product_id ] as $val_prc ) {
							if ( $val_prc == $price ) {
								$new_price = $price;
							}
						}
					}
				}
				else {
//					echo '<pre>' . print_r(9999999999, true) . '</pre>';
					$new_price = apply_filters( 'wmc_wc_product_get_price', wmc_get_price( $price ) );
				}
			} else {
//				echo '<pre>' . print_r(1010011100044424242, true) . '</pre>';
				$new_price = apply_filters( 'wmc_wc_product_get_price', wmc_get_price( $price ) );
//				echo '<pre>' . print_r($new_price, true) . '</pre>';
			}
		}
//echo '<pre>' . print_r(444444444, true) . '</pre>';
//echo '<pre>' . print_r($new_price, true) . '</pre>';
		return $this->set_cache( $new_price, $product_id, $price );
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_get_sale_price( $price, $product ) {
		if ( ! $price ) {
			return $price;
		}
		$product_id = $product->get_id();
		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}
		$changes          = $product->get_changes();
		$no_fixed_changes = is_array( $changes ) ? count( $changes ) < 1 : false;
		if ( is_plugin_active( 'advanced-dynamic-pricing-for-woocommerce/advanced-dynamic-pricing-for-woocommerce.php' ) ) {
			if ( is_array( $changes ) && array_key_exists( 'adpCustomInitialPrice', $changes ) && count( $changes ) < 2 ) {
				$no_fixed_changes = true;
			}
		}

		if ( self::$settings->check_fixed_price() && $no_fixed_changes ) {
			$current_currency = self::$settings->get_current_currency();
			$fixed_price      = self::get_fixed_price( $product, $current_currency, 'sale_price' );
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}

		return $this->set_cache( wmc_get_price( $price ), $product_id, $price );
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return mixed
	 */
	public function woocommerce_product_get_regular_price( $price, $product ) {
		if ( ! $price ) {
			return $price;
		}
		$product_id = $product->get_id();
		if ( ! wp_doing_ajax() && isset( $this->price[ $product_id ][ $price ] ) ) {
			return $this->price[ $product_id ][ $price ];
		}
		$changes          = $product->get_changes();
		$no_fixed_changes = is_array( $changes ) ? ( count( $changes ) < 1 || ( count( $changes ) == 1 && isset( $changes['description'] ) ) ) : false;
		if ( is_plugin_active( 'advanced-dynamic-pricing-for-woocommerce/advanced-dynamic-pricing-for-woocommerce.php' ) ) {
			if ( is_array( $changes ) && array_key_exists( 'adpCustomInitialPrice', $changes ) ) {
				if ( count( $changes ) < 2 || ( count( $changes ) < 3 && isset( $changes['description'] ) ) ) {
					$no_fixed_changes = true;
				}
			}
		}

		if ( self::$settings->check_fixed_price() && $no_fixed_changes ) {
			$current_currency = self::$settings->get_current_currency();
			$fixed_price      = self::get_fixed_price( $product, $current_currency, 'regular_price' );
			$default_currency = self::$settings->get_default_currency();
			if ( $fixed_price !== false || ( self::$settings->get_params( 'ignore_exchange_rate' ) && $default_currency !== $current_currency ) ) {
				return $this->set_cache( $fixed_price, $product_id, $price );
			}
		}
		do_action( 'wmc_before_convert_regular_price', $product, $price );
		$price = $this->set_cache( wmc_get_price( $price ), $product_id, $price );
		do_action( 'wmc_after_convert_regular_price', $product, $price );

		return $price;
	}


	public function apply_beauty_price_to_shipping( $is_shipping_price ) {
		return ! boolval( self::$settings->get_params( 'beauty_price_shipping' ) );
	}

	public static function format_beauty_price( $price, $current_currency ) {
		$enable                = self::$settings->get_param( 'beauty_price_enable' );
		$input_price           = wc_prices_include_tax();
		$shop_display_incl_tax = 'incl' === get_option( 'woocommerce_tax_display_shop' ) ? true : false;
		$cart_display_incl_tax = 'incl' === get_option( 'woocommerce_tax_display_cart' ) ? true : false;

		$cond_1 = $input_price && $shop_display_incl_tax && $cart_display_incl_tax;
		$cond_2 = ! $input_price && ! $shop_display_incl_tax && ! $cart_display_incl_tax;

		if ( $enable && ( $cond_1 || $cond_2 || ! wc_tax_enabled() ) ) {
			/*Make price like the final price before applying beauty price rules*/
			$processed_price = WOOMULTI_CURRENCY_Data::convert_price_to_float( $price );
			$int             = $new_int = (int) $processed_price;
			$fraction        = $new_fraction = $processed_price - $int;
//			$int      = $new_int = (int) $price;
//			$fraction = $new_fraction = $price - $int;

			$lower_bound = self::$settings->get_param( 'price_lower_bound' );
			$from        = self::$settings->get_param( 'beauty_price_from' );
			$to          = self::$settings->get_param( 'beauty_price_to' );
			$value       = self::$settings->get_param( 'beauty_price_value' );
			$currencies  = self::$settings->get_param( 'beauty_price_currencies' );
			$int_frac    = self::$settings->get_param( 'beauty_price_part' );
			$round_up    = self::$settings->get_param( 'beauty_price_round_up' );

			$count_from       = is_array( $from ) ? count( $from ) : '';
			$count_to         = is_array( $to ) ? count( $to ) : '';
			$count_value      = is_array( $value ) ? count( $value ) : '';
			$count_currencies = is_array( $currencies ) ? count( $currencies ) : '';
			$count_int_frac   = is_array( $int_frac ) ? count( $int_frac ) : '';

			if ( $count_from && $count_to && $count_value && $count_currencies && $count_int_frac ) {
				$count = min( $count_from, $count_to, $count_value, $count_currencies, $count_int_frac );
				if ( ! is_array( $round_up ) || count( $round_up ) !== $count ) {
					$round_up = array_fill( 0, $count, 0 );
				}
				for ( $i = 0; $i < $count; $i ++ ) {
					if ( empty( $currencies[ $i ] ) || ! in_array( $current_currency, $currencies[ $i ] ) ) {
						continue;
					}
					if ( $int_frac[ $i ] === 'integer' ) {
						$offset = strlen( $value[ $i ] );
						if ( $offset == 0 ) {
							continue;
						}
						$price_length = strlen( $int );
						if ( $price_length >= $offset ) {
							$first_part_price  = substr( $int, 0, - $offset );
							$second_part_price = substr( $int, - $offset );

							if ( $lower_bound ) {
								if ( (int) $second_part_price >= (int) $from[ $i ] && (int) $second_part_price <= (int) $to[ $i ] ) {
									$new_int = $first_part_price . $value[ $i ];
									$new_int = (int) $new_int;
									if ( $round_up[ $i ] ) {
										$new_int += pow( 10, strlen( $from[ $i ] ) );
									}
									$price = $new_int + (float) $new_fraction;
									break;
								}
							} else {
								if ( (int) $second_part_price > (int) $from[ $i ] && (int) $second_part_price <= (int) $to[ $i ] ) {
									$new_int = $first_part_price . $value[ $i ];
									$new_int = (int) $new_int;
									if ( $round_up[ $i ] ) {
										$new_int += pow( 10, strlen( $from[ $i ] ) );
									}
									$price = $new_int + (float) $new_fraction;
									break;
								}
							}
						}
					}
				}
				for ( $i = 0; $i < $count; $i ++ ) {
					if ( empty( $currencies[ $i ] ) || ! in_array( $current_currency, $currencies[ $i ] ) ) {
						continue;
					}
					if ( $int_frac[ $i ] === 'fraction' ) {
						$f_from  = (float) $from[ $i ];
						$f_to    = (float) $to[ $i ];
						$f_value = $value[ $i ];
						$offset  = 0;

						if ( $f_from > 1 || $f_to > 1 ) {
							continue;
						}

						switch ( true ) {
							case $f_value == '':
								$offset = 0;
								break;
							case $f_value >= 1:
								$offset = strlen( $value[ $i ] );
								break;
							case $f_value < 1:
								$string = str_replace( ',', '.', $f_value );
								$string = substr( $string, strpos( $string, '.' ) + 1 );
								$offset = strlen( $string );
								break;
						}
						if ( $offset > intval( self::$decimal_data ) ) {
							self::$decimal_data = $offset;
						}

						$f_value = (float) $f_value;

						if ( $lower_bound ) {
							if ( (float) $fraction >= $f_from && (float) $fraction < $f_to ) {
								$new_fraction = $f_value;
								$price        = $new_int + (float) $new_fraction;
								if ( $round_up[ $i ] ) {
									$price += 1;
								}
								break;
							}
						} else {
							if ( (float) $fraction > $f_from && (float) $fraction < $f_to ) {
								$new_fraction = $f_value;
								$price        = $new_int + (float) $new_fraction;
								if ( $round_up[ $i ] ) {
									$price += 1;
								}
								break;
							}
						}
					}
				}
			}
		}

		return (float) $price;
	}

	public function override_decimal( $decimal ) {

		if ( self::$decimal_data !== '' ) {
			return self::$decimal_data;
		}

		return $decimal;
	}

	public function wc_get_price_thousand_separator( $thousand_sep ) {
		$current_curency = self::$settings->get_current_currency();
		$list_currencies = self::$settings->get_list_currencies();
		if ( $current_curency && $list_currencies && isset( $list_currencies[ $current_curency ] ) ) {
			if ( isset( $list_currencies[ $current_curency ]['thousand_sep'] ) && ! empty( $list_currencies[ $current_curency ]['thousand_sep'] ) ) {
				return $list_currencies[ $current_curency ]['thousand_sep'];
			}
		}

		return $thousand_sep;
	}

	public function wc_get_price_decimal_separator( $decimal_sep ) {
		$current_curency = self::$settings->get_current_currency();
		$list_currencies = self::$settings->get_list_currencies();
		if ( $current_curency && $list_currencies && isset( $list_currencies[ $current_curency ] ) ) {
			if ( isset( $list_currencies[ $current_curency ]['decimal_sep'] ) && ! empty( $list_currencies[ $current_curency ]['decimal_sep'] ) ) {
				return $list_currencies[ $current_curency ]['decimal_sep'];
			}
		}

		return $decimal_sep;
	}

	public function woocommerce_structured_data_product_offer( $markup_offer, $product ) {
		if ( ! $product || ! is_array( $markup_offer ) || empty( $markup_offer ) ) {
			return $markup_offer;
		}
		$current_curency = self::$settings->get_current_currency();
		$default_curency = self::$settings->get_default_currency();

		if ( $current_curency == $default_curency || self::$settings->get_param('fixed_structure_currency') == 'unset' ) {
			return $markup_offer;
		}
		if (isset( $markup_offer['priceCurrency'] )) {
			$markup_offer['priceCurrency'] = $default_curency;
		}
		if (isset( $markup_offer['lowPrice'] )) {
			$markup_offer['lowPrice'] = wc_format_decimal( wmc_revert_price( $markup_offer['lowPrice'] ), wc_get_price_decimals() );
		}
		if (isset( $markup_offer['highPrice'] )) {
			$markup_offer['highPrice'] = wc_format_decimal( wmc_revert_price( $markup_offer['highPrice'] ), wc_get_price_decimals() );
		}

		if (isset( $markup_offer['priceSpecification'] ) && is_array( $markup_offer['priceSpecification'] )) {
			foreach ( $markup_offer['priceSpecification'] as $sp_key => $spec ) {
				if ( empty( $spec ) || ! is_array( $spec ) ) {
					continue;
				}
				if ( isset( $spec['price'] ) && ! empty( $spec['price'] ) ) {
					$markup_offer['priceSpecification'][$sp_key]['price'] = wc_format_decimal( wmc_revert_price( $spec['price'] ), wc_get_price_decimals() );
				}

				if (isset( $spec['priceCurrency'] )) {
					$markup_offer['priceSpecification'][$sp_key]['priceCurrency'] = $default_curency;
				}
			}
		}

		return $markup_offer;
	}

	/**Fix error 500 with Subscriptions for WooCommerce plugin from WebToffee if using $product->is_on_sale('edit') for variable_subscription product
	 *
	 * @param $product WC_Product
	 *
	 * @return bool
	 */
	public static function is_on_sale( $product ) {
		$context = 'edit';
		if ( '' !== (string) $product->get_sale_price( $context ) && $product->get_regular_price( $context ) > $product->get_sale_price( $context ) ) {
			$on_sale = true;

			if ( $product->get_date_on_sale_from( $context ) && $product->get_date_on_sale_from( $context )->getTimestamp() > time() ) {
				$on_sale = false;
			}

			if ( $product->get_date_on_sale_to( $context ) && $product->get_date_on_sale_to( $context )->getTimestamp() < time() ) {
				$on_sale = false;
			}
		} else {
			$on_sale = false;
		}

		return $on_sale;
	}

	/**
	 * @param $product WC_Product
	 * @param $current_currency
	 * @param string $type
	 *
	 * @return bool|float
	 */
	public static function get_fixed_price( $product, $current_currency, $type = '' ) {
		$price = self::get_product_fixed_price( $product, $current_currency, $type );

		if ( $price === false ) {
			if ( class_exists( 'SitePress' ) ) {
				if ( self::$language === null ) {
					self::$language   = '';
					$default_lang     = apply_filters( 'wpml_default_language', null );
					$current_language = apply_filters( 'wpml_current_language', null );
					if ( $current_language && $current_language !== $default_lang ) {
						self::$language = $current_language;
					}
				}
			} else {
				self::$language = '';
			}
			if ( self::$language ) {
				global $sitepress;
				if ( ! $product || ! is_object( $product ) ) {
					return $price;
				}
				$product_id     = $product->get_id();
				$wpml_object_id = apply_filters(
					'wpml_object_id', $product_id, 'product', false, $sitepress->get_default_language()
				);
				if ( $wpml_object_id != $product_id ) {
					$wpml_product = wc_get_product( $wpml_object_id );
					if ( $wpml_product ) {
						$price = self::get_product_fixed_price( $wpml_product, $current_currency, $type );
					}
				}
			}
		}

		return $price;
	}

	/**
	 * @param $product WC_Product
	 * @param $current_currency
	 * @param $type
	 *
	 * @return bool|float
	 */
	private static function get_product_fixed_price( $product, $current_currency, $type ) {
		$price = false;

		if ( self::$settings->get_current_currency() !== self::$settings->get_default_currency() && $product && is_object( $product ) ) {
			$product_id = $product->get_id();

			switch ( $type ) {
				case 'regular_price':
					$product_price = wmc_adjust_fixed_price( self::static_json_price_meta( $product->get_meta( '_regular_price_wmcp', true ) ) );
					if ( isset( $product_price[ $current_currency ] ) && $product_price[ $current_currency ] != '' ) {
						$price = $product_price[ $current_currency ];
					}
					break;

				case 'sale_price':
					$sale_price = wmc_adjust_fixed_price( self::static_json_price_meta( $product->get_meta( '_sale_price_wmcp', true ) ) );
					if ( isset( $sale_price[ $current_currency ] ) && $sale_price[ $current_currency ] != '' ) {
						$price = $sale_price[ $current_currency ];
					}
					break;

				default:
					$product_price = wmc_adjust_fixed_price( self::static_json_price_meta( $product->get_meta( '_regular_price_wmcp', true ) ) );

					if ( isset( $product_price[ $current_currency ] ) && ! $product->is_on_sale( 'edit' ) && $product_price[ $current_currency ] != '' ) {
						$price = $product_price[ $current_currency ];
					} else {
						$sale_price = wmc_adjust_fixed_price( self::static_json_price_meta( $product->get_meta( '_sale_price_wmcp', true ) ) );
						if ( isset( $sale_price[ $current_currency ] ) && $sale_price[ $current_currency ] != '' ) {
							$price = $sale_price[ $current_currency ];
						}
					}

//					$price         = isset( $product_price[ $current_currency ] ) && $product_price[ $current_currency ] > 0 ? $product_price[ $current_currency ] : $price;
//					if ( $product->is_on_sale( 'edit' ) ) {
//						$sale_price = wmc_adjust_fixed_price( self::static_json_price_meta( $product->get_meta('_sale_price_wmcp', true ) ) );
//						if ( isset( $sale_price[ $current_currency ] ) && $sale_price[ $current_currency ] != '' ) {
//							$price = $sale_price[ $current_currency ];
//						}
//					}
			}

		}

		return $price;
	}

	public static function static_json_price_meta( $price_meta ) {

		return is_string( $price_meta ) ? json_decode( $price_meta, true ) : $price_meta;
	}
}