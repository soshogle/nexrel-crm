<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Frontend_Design
 */
class WOOMULTI_CURRENCY_Frontend_Design {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		add_action( 'wp_footer', array( $this, 'show_action' ) );
		if ( $this->settings->get_enable() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'front_end_script' ), 1 );
			add_action( 'wp_enqueue_scripts', array( $this, 'switch_currency_by_js_script' ), 999999 );
			add_filter( 'body_class', array( $this, 'body_class' ) );
		}
	}

	public function body_class( $classes ) {
		if ( ! is_checkout() && is_array( $classes ) ) {
			$classes[] = 'woocommerce-multi-currency-' . $this->settings->get_current_currency();
		}

		return $classes;
	}

	/**
	 * Public
	 */
	public function switch_currency_by_js_script() {
		if ( WP_DEBUG ) {
			wp_enqueue_script( 'woocommerce-multi-currency-switcher', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-switcher.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
		} else {
			wp_enqueue_script( 'woocommerce-multi-currency-switcher', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-switcher.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
		}

		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return;
		}
		$params = array(
			'use_session'        => $this->settings->use_session(),
			'do_not_reload_page' => $this->settings->get_param( 'do_not_reload_page' ),
			'ajax_url'           => admin_url( 'admin-ajax.php' ),
			'posts_submit'       => ! empty( $_POST ) ? count( $_POST ) : 0,
			'switch_by_js'       => $this->settings->enable_switch_currency_by_js() ? 1 : '',
			'switch_container'   => apply_filters( 'wmc_switcher_currency_by_container', 0 ),
		);
		wp_localize_script( 'woocommerce-multi-currency-switcher', '_woocommerce_multi_currency_params', $params );
	}

	public function front_end_script() {
		if ( WP_DEBUG ) {
			wp_enqueue_style( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency.css', array(), WOOMULTI_CURRENCY_VERSION );
			if ( is_rtl() ) {
				wp_enqueue_style( 'woocommerce-multi-currency-rtl', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency-rtl.css', array(), WOOMULTI_CURRENCY_VERSION );
			}
			wp_register_style( 'woocommerce-multi-currency-collate', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency-collate.css', array(), WOOMULTI_CURRENCY_VERSION );
		} else {
			wp_enqueue_style( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency.min.css', array(), WOOMULTI_CURRENCY_VERSION );
			if ( is_rtl() ) {
				wp_enqueue_style( 'woocommerce-multi-currency-rtl', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency-rtl.min.css', array(), WOOMULTI_CURRENCY_VERSION );
			}
			wp_register_style( 'woocommerce-multi-currency-collate', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency-collate.min.css', array(), WOOMULTI_CURRENCY_VERSION );
		}
		/*Custom CSS*/
		$text_color                = $this->settings->get_text_color();
		$background_color          = $this->settings->get_background_color();
		$main_color                = $this->settings->get_main_color();
		$hover_color               = $this->settings->get_hover_color();
		$sidebar_layout            = $this->settings->get_sidebar_layout();
		$sidebar_top_position      = $this->settings->get_param( 'sidebar_position' );
		$name_background_color     = $this->settings->get_param( 'name_background_color' );
		$expand_button_color       = $this->settings->get_param( 'expand_button_color' );
		$expand_button_background  = $this->settings->get_param( 'expand_button_background' );
		$expand_button_opacity     = (float) $this->settings->get_param( 'expand_button_opacity' );
		$expand_button_opacity     = sprintf( "%02x", $expand_button_opacity * 255 );
		$shortcode_bg_color        = $this->settings->get_param( 'shortcode_bg_color' );
		$shortcode_color           = $this->settings->get_param( 'shortcode_color' );
		$shortcode_active_bg_color = $this->settings->get_param( 'shortcode_active_bg_color' );
		$shortcode_active_color    = $this->settings->get_param( 'shortcode_active_color' );

		$links        = $this->settings->get_links();
		$currency_qty = count( $links ) - 1;
		$custom = '';

		if ( $sidebar_layout == 'full' ) {
			$custom = '.woocommerce-multi-currency .wmc-list-currencies .wmc-currency.wmc-active > a {background: ' . $main_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-list-currencies .wmc-currency:hover:not(.wmc-active) > a {background: ' . $hover_color . ' !important;}';
//			$custom .= '.woocommerce-multi-currency.wmc-switcher-layout-full .wmc-list-currencies .wmc-currency.wmc-active a.wmc-currency-redirect {border-color: ' . $main_color . ' !important;}';
//			$custom .= '.woocommerce-multi-currency.wmc-switcher-layout-full .wmc-list-currencies .wmc-currency:not(.wmc-active) a.wmc-currency-redirect {border-color: ' . $background_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency.wmc-switcher-layout-full.wmc-collapse:not(.wmc-hover) .wmc-list-currencies .wmc-currency:not a.wmc-currency-redirect {background: ' . $background_color . ' !important;}';
//			$custom .= '.woocommerce-multi-currency.wmc-switcher-layout-full.wmc-hover .wmc-list-currencies .wmc-currency:hover a.wmc-currency-redirect {border-color: ' . $main_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency:not(.wmc-collapse) .wmc-list-currencies .wmc-currency {background: ' . $background_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency.wmc-collapse.wmc-hover .wmc-list-currencies .wmc-currency {background: ' . $background_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-title, .woocommerce-multi-currency.wmc-price-switcher a {background: ' . $background_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency.wmc-price-switcher .wmc-sub-currency .wmc-currency a:hover {background: ' . $hover_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-title, .woocommerce-multi-currency .wmc-list-currencies .wmc-currency span,.woocommerce-multi-currency .wmc-list-currencies .wmc-currency a,.woocommerce-multi-currency.wmc-price-switcher a {color: ' . $text_color . ' !important;}';
		}
		if ( ! in_array( $sidebar_layout, ['full', 'hover_detail'] ) ) {
			$custom = '.woocommerce-multi-currency .wmc-list-currencies .wmc-currency.wmc-active {background: ' . $main_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-list-currencies .wmc-currency:hover {background: ' . $hover_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-list-currencies .wmc-currency,.woocommerce-multi-currency .wmc-title, .woocommerce-multi-currency.wmc-price-switcher a {background: ' . $background_color . ' !important;}';
			$custom .= '.woocommerce-multi-currency .wmc-title, .woocommerce-multi-currency .wmc-list-currencies .wmc-currency span,.woocommerce-multi-currency .wmc-list-currencies .wmc-currency a,.woocommerce-multi-currency.wmc-price-switcher a {color: ' . $text_color . ' !important;}';
		}
		if ( $sidebar_layout == 'single' ) {
			$custom .= '.woocommerce-multi-currency.wmc-sidebar.wmc-switcher-layout-single .wmc-list-currencies .wmc-currency .wmc-currency-redirect .wmc-currency-content-left {background-color: ' . $name_background_color . ' ;}';
        }
		if ( $sidebar_layout == 'hover_detail' ) {
			$custom .= '.woocommerce-multi-currency.wmc-sidebar.wmc-switcher-layout-hoverdt .wmc-list-currencies .wmc-currency .wmc-currency-redirect >span {background-color: ' . $background_color . ' ;}';
			$custom .= '.woocommerce-multi-currency.wmc-sidebar.wmc-switcher-layout-hoverdt .wmc-list-currencies .wmc-currency .wmc-currency-redirect:hover >span {background-color: ' . $hover_color . ' ;}';
			$custom .= '.woocommerce-multi-currency.wmc-sidebar.wmc-switcher-layout-hoverdt .wmc-list-currencies .wmc-currency.wmc-active .wmc-currency-redirect >span {background-color: ' . $main_color . ' ;}';
        }

		if ( $sidebar_top_position ) {
			$custom .= "@media screen and (min-width: 769px) {.woocommerce-multi-currency.wmc-sidebar{top:{$sidebar_top_position} !important;}}";
        }

		$custom .= ".woocommerce-multi-currency.wmc-sidebar .wmc-list-currencies .wmc-sidebar-open{background-color:{$expand_button_background}{$expand_button_opacity};color:{$expand_button_color};}";

		$custom .= ".woocommerce-multi-currency.wmc-shortcode .wmc-currency{background-color:{$shortcode_bg_color};color:{$shortcode_color}}";
		$custom .= ".woocommerce-multi-currency.wmc-shortcode .wmc-currency.wmc-active,.woocommerce-multi-currency.wmc-shortcode .wmc-current-currency{background-color:{$shortcode_active_bg_color};color:{$shortcode_active_color}}";
		$custom .= ".woocommerce-multi-currency.wmc-shortcode.vertical-currency-symbols-circle:not(.wmc-currency-trigger-click) .wmc-currency-wrapper:hover .wmc-sub-currency,.woocommerce-multi-currency.wmc-shortcode.vertical-currency-symbols-circle.wmc-currency-trigger-click .wmc-sub-currency{animation: height_slide {$currency_qty}00ms;}";
		$custom .= "@keyframes height_slide {0% {height: 0;} 100% {height: {$currency_qty}00%;} }";

		$custom .= $this->settings->get_custom_css();
		wp_add_inline_style( 'woocommerce-multi-currency', $custom );

		switch ( $this->settings->get_sidebar_style() ) {
			case 2:
			case 3:
			case 4:
				$custom1 = $sidebar_layout == 'single' ? '' : '.woocommerce-multi-currency.wmc-sidebar.style-1 .wmc-list-currencies .wmc-currency .wmc-currency-content-left:not(.wmc-active-title){width:60px !important;}';
				$custom1 .= '.woocommerce-multi-currency.wmc-sidebar.wmc-right{right: -190px ;}';
				$custom1 .= '.woocommerce-multi-currency.wmc-sidebar.wmc-left{left: -190px ;}';
				wp_add_inline_style( 'woocommerce-multi-currency', $custom1 );
				break;
		}
		/*Multi currency JS*/
		if ( WP_DEBUG ) {
			wp_enqueue_script( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_register_script( 'woocommerce-multi-currency-convertor', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-convertor.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
		} else {
			wp_enqueue_script( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_register_script( 'woocommerce-multi-currency-convertor', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-convertor.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
		}

		if ( $this->settings->get_params( 'load_ajax_filter_price' ) ) {
			global $wpdb;
			global $wp_query;
			$query_args_object = WC()->query->get_main_query();
			if ( ! empty( $query_args_object ) ) {
				$args       = WC()->query->get_main_query()->query_vars;
				$tax_query  = isset( $args['tax_query'] ) ? $args['tax_query'] : array();
				$meta_query = isset( $args['meta_query'] ) ? $args['meta_query'] : array();

				if ( ! is_post_type_archive( 'product' ) && ! empty( $args['taxonomy'] ) && ! empty( $args['term'] ) ) {
					$tax_query[] = WC()->query->get_main_tax_query();
				}

				foreach ( $meta_query + $tax_query as $key => $query ) {
					if ( ! empty( $query['price_filter'] ) || ! empty( $query['rating_filter'] ) ) {
						unset( $meta_query[ $key ] );
					}
				}

//				$meta_query = new WP_Meta_Query( $meta_query );
//				$tax_query  = new WP_Tax_Query( $tax_query );
				$search     = WC_Query::get_main_search_query_sql();

//				$meta_query_sql   = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
//				$tax_query_sql    = $tax_query->get_sql( $wpdb->posts, 'ID' );
				$search_query_sql = $search ? ' AND ' . $search : '';
				$search_query_vars = $wp_query->query_vars;
			}
		}

		wp_localize_script( 'woocommerce-multi-currency', 'wooMultiCurrencyParams', array(
			'enableCacheCompatible'          => apply_filters( 'wmc_enable_cache_compatible_frontend', $this->settings->get_param( 'cache_compatible' ) ),
			'ajaxUrl'                        => admin_url( 'admin-ajax.php' ),
			'switchByJS'                     => $this->settings->enable_switch_currency_by_js(),
			'woo_subscription'               => is_plugin_active( 'woocommerce-subscriptions/woocommerce-subscriptions.php' ),
			'extra_params'                   => apply_filters( 'wmc_frontend_extra_params', array() ),
			'current_currency'               => $this->settings->get_current_currency(),
			'currencyByPaymentImmediately'   => $this->settings->get_param( 'currency_by_payment_method_immediate' ),
			'click_to_expand_currencies_bar' => $this->settings->get_param( 'click_to_expand_currencies_bar' ),
			'filter_price_meta_query'        => isset( $meta_query ) ? wp_json_encode( $meta_query ) : '',
			'filter_price_tax_query'         => isset( $tax_query ) ? wp_json_encode( $tax_query ) : '',
			'filter_price_search_query'      => isset( $search_query_sql ) ? wp_json_encode( $search_query_sql ) : '',
			'filter_price_query_vars'        => isset( $search_query_vars ) ? wp_json_encode( $search_query_vars ) : '',
		) );
	}

	/**
	 * Show Currency converter
	 */
	public function show_action() {
		if ( ! $this->enable() ) {
			return;
		}

		wp_enqueue_style( 'wmc-flags', WOOMULTI_CURRENCY_CSS . 'flags-64.min.css', '', WOOMULTI_CURRENCY_VERSION );
//		wp_enqueue_style( 'wmc-flags-48', WOOMULTI_CURRENCY_CSS . 'flags-48.min.css', '', WOOMULTI_CURRENCY_VERSION );
		$logic_value = $this->settings->get_conditional_tags();

		if ( $logic_value ) {
			if ( stristr( $logic_value, "return" ) === false ) {
				$logic_value = "return (" . $logic_value . ");";
			}
			try {
				if ( ! eval( $logic_value ) ) {// phpcs:ignore Generic.PHP.ForbiddenFunctions.Found
					return;
				}
			} catch ( Error $e ) {
				trigger_error( esc_html( $e->getMessage() ), E_USER_WARNING );

				return;
			} catch ( Exception $e ) {
				trigger_error( esc_html( $e->getMessage() ), E_USER_WARNING );

				return;
			}
		}
		$enable_checkout = $this->settings->get_enable_multi_payment();
		if ( ! $enable_checkout && is_checkout() ) {
			return;
		}
		$language = '';
		if ( is_plugin_active( 'sitepress-multilingual-cms/sitepress.php' ) ) {
			$default_lang     = apply_filters( 'wpml_default_language', null );
			$current_language = apply_filters( 'wpml_current_language', null );

			if ( $current_language && $current_language !== $default_lang ) {
				$language = $current_language;
			}
		} else if ( class_exists( 'Polylang' ) && function_exists( 'pll_default_language' ) ) {
			$default_lang     = pll_default_language( 'slug' );
			$current_language = pll_current_language( 'slug' );
			if ( $current_language && $current_language !== $default_lang ) {
				$language = $current_language;
			}
		}
		$currency_selected   = $this->settings->get_current_currency();
		$title               = $this->settings->get_design_title( $language );
		$enable_collapse     = $this->settings->enable_collapse();
		$mb_disable_collapse = $this->settings->disable_collapse();
		$class               = array();
		$sidebar_layout      = $this->settings->get_sidebar_layout();

//		if ( $sidebar_layout == 'split' ) {
//			$class[] = 'wmc-switcher-layout-split';
//		} else {
//			$class[] = 'wmc-switcher-layout-full';
//		}
//		$sidebar_layout = 'single';
		switch ( $sidebar_layout ) {
			case 'split':
				$class[] = 'wmc-switcher-layout-split';
				break;
			case 'full':
				$class[] = 'wmc-switcher-layout-full';
				break;
			case 'single':
				$class[] = 'wmc-switcher-layout-single';
				break;
			case 'hover_detail':
				$class[] = 'wmc-switcher-layout-hoverdt';
				break;
		}

		/*Position left or right*/
        $side_position = $this->settings->get_design_position();
		if ( ! $side_position ) {
			$class[] = 'wmc-left';
		} else {
			$class[] = 'wmc-right';
		}

		$class[] = 'style-1';

		switch ( $this->settings->get_sidebar_style() ) {
			case 1:
				$class[] = 'wmc-currency-symbol';
				break;
			case 2:
				$class[] = 'wmc-currency-flag';
				break;
			case 3:
				$class[] = 'wmc-currency-flag wmc-currency-code';
				break;
			case 4:
				$class[] = 'wmc-currency-flag wmc-currency-symbol';
				break;
		}

		if ( $enable_collapse ) {
			$class[] = 'wmc-collapse';
		}

		if ( $mb_disable_collapse ) {
			$class[] = 'wmc-mobile-no-collapse';
		}

		$style = '';
		if ( $max_height = $this->settings->get_param( 'max_height' ) ) {
			$style = "max-height:{$max_height}px; overflow-y:auto;overflow-x:hidden;";
		}
        $template_args = [
            'class' => $class,
            'title' => $title,
            'style' => $style,
            'settings' => $this->settings,
            'currency_selected' => $currency_selected,
        ];
		switch ( $sidebar_layout ) {
			case 'single':
				wmc_get_template( 'switcher-single-select.php', $template_args );
				break;
			case 'hover_detail':
				wmc_get_template( 'switcher-hover-detail.php', $template_args );
				break;
			default:
				wmc_get_template( 'switcher-classic.php', $template_args );
		}
	}

	/**
	 * Check design enable
	 * @return bool
	 *
	 */
	protected function enable() {
		if ( ! $this->settings->get_enable_design() ) {
			return false;
		}
		if ( $this->settings->is_checkout() ) {
			if ( is_checkout() ) {
				return false;
			}
		}
		if ( $this->settings->is_cart() ) {
			if ( is_cart() ) {
				return false;
			}
		}

		return true;
	}
}