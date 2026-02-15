<?php

/**
 * Class WOOMULTI_CURRENCY_Frontend_Cache
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Frontend_Cache {
	protected static $settings;
	protected $price_args;
	protected $mini_cart;

	public function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( self::$settings->get_enable() ) {
//			add_action( 'init', array( $this, 'clear_browser_cache' ) );
			add_action( 'wp_ajax_wmc_get_products_price', array( $this, 'get_products_price' ) );
			add_action( 'wp_ajax_nopriv_wmc_get_products_price', array( $this, 'get_products_price' ) );

			$cache_compatible = self::$settings->get_param( 'cache_compatible' );
			if ( $cache_compatible || ( self::$settings->enable_switch_currency_by_js() && self::$settings->get_param( 'do_not_reload_page' ) ) ) {

				if ( $cache_compatible == 1 ) {
					add_filter( 'woocommerce_get_price_html', array(
						$this,
						'compatible_cache_plugin'
					), PHP_INT_MAX, 2 );
				} elseif ( $cache_compatible == 2 ) {
					add_filter( 'wc_price', array( $this, 'compatible_cache_plugin_by_json' ), 1000, 5 );
					add_action( 'woocommerce_before_mini_cart_contents', [ $this, 'start_mini_cart' ] );
					add_action( 'woocommerce_after_mini_cart', [ $this, 'end_mini_cart' ] );
				}
			}

			add_action( 'storeabill_before_document', [ $this, 'remove_cache_mark_for_wc_price' ] );

			if ( is_plugin_active( 'loyalty-points-rewards/wp-loyalty-points-rewards.php' ) && $cache_compatible == 2 ) {
				add_filter( 'woocommerce_add_to_cart_fragments', array( $this, 'remove_cache_mark_for_wc_price' ) );
				add_filter( 'woocommerce_update_order_review_fragments', array(
					$this,
					'remove_cache_mark_for_wc_price'
				) );

				add_filter( 'wlpr_point_redeem_points_message', array( $this, 'add_cache_mark_for_wc_price' ), 10, 2 );
			}
		}
	}

	/**
	 * @param $price
	 * @param $product WC_Product
	 *
	 * @return string
	 */
	public function compatible_cache_plugin( $price, $product ) {
		if ( wp_doing_ajax() ) {
			return $price;
		} else {
			$theme = wp_get_theme();
			if ( $theme && is_object( $theme ) && in_array( $theme->name, ['Woodmart Child', 'Woodmart'] ) ) {
				$is_ajax = empty( $_SERVER['HTTP_X_REQUESTED_WITH'] ) ? false : strcasecmp( $_SERVER['HTTP_X_REQUESTED_WITH'], 'xmlhttprequest' ) == 0;
				if ( $is_ajax ) {
					return $price;
				}
			}
		}

		$wrap = 'span';
		if ( strpos( $price, '<div' ) !== false || strpos( $price, '<p' ) !== false ) {
			$wrap = 'div';
		}

		$loading = self::$settings->get_param( 'loading_price_mask' ) ? 'wmc-cache-loading' : '';

		return '<' . $wrap . ' class="wmc-cache-pid ' . $loading . '" data-wmc_product_id="' . $product->get_id() . '">' . $price . '</' . $wrap . '>';
	}

	public function start_mini_cart() {
		$this->mini_cart = true;
	}

	public function end_mini_cart() {
		$this->mini_cart = false;
	}

	public function compatible_cache_plugin_by_json( $return, $price, $args, $unformatted_price, $original_price ) {
		if ( is_cart() || is_checkout() || $this->mini_cart ) {
			return $return;
		}

		if ( is_admin() && ! wp_doing_ajax() ) {
			return $return;
		}

		if ( ! empty( $args['wmc_cache_price'] ) ) {
			return $return;
		}

		if ( is_plugin_active( 'loyalty-points-rewards/wp-loyalty-points-rewards.php' ) ) {
			if ( is_cart() || is_checkout() ) {
				return $return;
			}
			if ( wp_doing_ajax() && isset( $_REQUEST['wc-ajax'] ) && wc_clean( wp_unslash( $_REQUEST['wc-ajax'] ) ) == 'get_refreshed_fragments' ) {
				return $return;
			}
		}

		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return $return;
		}

		if ( isset( $_REQUEST['action'] ) ) {
			$action_case = wc_clean( wp_unslash( $_REQUEST['action'] ) );
			if ( $action_case == 'wpo_wcpdf_preview' || $action_case == 'generate_wpo_wcpdf' || str_contains( $action_case, 'storeabill_woo_admin_' ) ) {
				return $return;
			}
		}

		$currency         = self::$settings->get_current_currency();
		$list_currencies  = self::$settings->get_list_currencies();
		$default_currency = self::$settings->get_default_currency();

		$cache = [];

		if ( $currency !== $default_currency ) {
			$original_price = wmc_revert_price( $original_price, $currency );
		}

		foreach ( $list_currencies as $currency_code => $currency_data ) {
			$wmc_price    = wmc_get_price( $original_price, $currency_code );
			$price_format = \WOOMULTI_CURRENCY_Data::get_price_format( $currency_data['pos'] ?? 'left' );

			$cache[ $currency_code ] = wc_price( $wmc_price, [
				'currency'        => $currency_code,
				'wmc_cache_price' => 1,
				'price_format'    => $price_format,
				'decimals'        => (int) $currency_data['decimals'] ?? 0
			] );
		}

		if ( $cache ) {
			$cache = wp_json_encode( $cache );
			$cache = _wp_specialchars( $cache, ENT_QUOTES, 'UTF-8', true );

			$wrap = 'span';
			if ( strpos( $price, '<div' ) !== false || strpos( $price, '<p' ) !== false ) {
				$wrap = 'div';
			}

			if ( is_plugin_active( 'woocommerce-tm-extra-product-options/tm-woo-extra-product-options.php' ) ) {
				return $return;
			}

			return '<' . $wrap . ' class="wmc-wc-price" >' . $return . '<span data-wmc_price_cache="' . $cache . '" style="display: none;" class="wmc-price-cache-list"></span></' . $wrap . '>';
		}

		return $return;
	}

	/**
	 * Clear cache browser
	 */
	public function clear_browser_cache() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		if ( isset( $_GET['wmc-currency'] ) ) {
			header( "Cache-Control: no-cache, must-revalidate" );
			header( "Expires: Mon, 26 Jul 1997 05:00:00 GMT" );
			header( "Content-Type: application/xml; charset=utf-8" );
		}
	}

	/**
	 *
	 */
	public function get_products_price() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! check_ajax_referer( 'wmc_frontend_nonce', '_woo_multi_currency_nonce' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Nonce invalid', 'woocommerce-multi-currency' ) ) );
		}
		do_action( 'wmc_get_products_price_ajax_handle_before' );
		$pids             = ! empty( $_POST['pids'] ) ? wc_clean( wp_unslash( $_POST['pids'] ) ) : [];
		$shortcodes       = ! empty( $_POST['shortcodes'] ) ? wc_clean( $_POST['shortcodes'] ) : array();
		$current_currency = self::$settings->get_current_currency();
		$list_currencies  = self::$settings->get_list_currencies();
		$result           = [ 'shortcodes' => [] ];

		$data   = $list_currencies[ $current_currency ];
		$format = WOOMULTI_CURRENCY_Data::get_price_format( $data['pos'] );
		$args   = array( 'currency' => $current_currency, 'price_format' => $format );

		if ( isset( $data['decimals'] ) ) {
			$args['decimals'] = absint( $data['decimals'] );
		}

		if ( ! empty( $pids ) ) {
			$this->price_args = $args;
			add_filter( 'wc_price_args', array( $this, 'change_price_format_by_specific_currency' ), PHP_INT_MAX );
			foreach ( $pids as $pid ) {
				$product = wc_get_product( $pid );
				if ( $product ) {
					if ( $product->is_type( 'variation' ) ) {
						$result['prices'][ $pid ] = '<span class="price">' . $product->get_price_html() . '</span>';
					} else {
						$result['prices'][ $pid ] = $product->get_price_html();
					}
				}
			}
			remove_filter( 'wc_price_args', array( $this, 'change_price_format_by_specific_currency' ), PHP_INT_MAX );
			$this->price_args = array();
		}

		if ( is_plugin_active( 'custom-stock-status-for-woocommerce/class-af-custom-stock-status.php' ) ) {
			$acss_product_detail_page = get_option( 'acss_product_detail_page' );
			if ( $acss_product_detail_page && 'yes' == $acss_product_detail_page ) {
				$result['prices'] = '';
			}
		}

		$result['current_currency'] = $current_currency;
		$result['current_country']  = strtolower( self::$settings->get_country_data( $current_currency )['code'] );
		$shortcodes_list            = self::$settings->get_list_shortcodes();

		if ( count( $shortcodes ) ) {
			foreach ( $shortcodes as $shortcode ) {
				if ( isset( $shortcodes_list[ $shortcode['layout'] ] ) ) {
					$flag_size              = isset( $shortcode['flag_size'] ) ? $shortcode['flag_size'] : '';
					$dropdown_icon          = isset( $shortcode['dropdown_icon'] ) ? $shortcode['dropdown_icon'] : '';
					$custom_format          = isset( $shortcode['custom_format'] ) ? $shortcode['custom_format'] : '';
					$dd_direction           = isset( $shortcode['direction'] ) ? $shortcode['direction'] : '';
					$result['shortcodes'][] = do_shortcode( "[woo_multi_currency_" . esc_attr( $shortcode['layout'] ) . " flag_size='" . esc_attr( $flag_size ) . "' dropdown_icon='" . esc_attr( $dropdown_icon ) . "' custom_format='" . esc_attr( $custom_format ) . "' direction='" . esc_attr( $dd_direction ) . "']" );
				} else {
					$result['shortcodes'][] = do_shortcode( "[woo_multi_currency]" );
				}
			}
		}

		if ( ! empty( $_POST['exchange'] ) ) {
			$exchange_sc  = [];
			$exchange_arr = wc_clean( wp_unslash( $_POST['exchange'] ) );
			foreach ( $exchange_arr as $ex ) {
				$exchange_sc[] = array_merge( $ex, [ 'shortcode' => do_shortcode( "[woo_multi_currency_exchange product_id='" . esc_attr( $ex['product_id'] ) . "' keep_format='" . esc_attr( $ex['keep_format'] ) . "' price='" . esc_attr( $ex['price'] ) . "' original_price='" . esc_attr( $ex['original_price'] ) . "' currency='" . esc_attr( $ex['currency'] ) . "']" ) ] );
			}
			$result['exchange'] = $exchange_sc;
		}

		if ( ! empty( $_POST['wc_filter_price'] ) && self::$settings->get_params( 'load_ajax_filter_price' ) ) {
			global $wp;

			$meta_query_sql   = isset( $_POST['wc_filter_price_meta'] ) ? wc_clean( wp_unslash( $_POST['wc_filter_price_meta'] ) ) : '';
			$tax_query_sql    = isset( $_POST['wc_filter_price_tax'] ) ? wc_clean( wp_unslash( $_POST['wc_filter_price_tax'] ) ) : '';
			//$search_query_sql = isset( $_POST['wc_filter_price_search'] ) ? wc_clean( wp_unslash( $_POST['wc_filter_price_search'] ) ) : '';
			$filter_price_query_vars = isset( $_POST['filter_price_query_vars'] ) ? wc_clean( wp_unslash( $_POST['filter_price_query_vars'] ) ) : '';
			$step             = max( apply_filters( 'woocommerce_price_filter_widget_step', 10 ), 1 );
//			$theme = wp_get_theme();
//			if ( 'Woodmart Child' != $theme->name || 'Woodmart' != $theme->name || 'woodmart' != $theme->name ) {
//				$prices = $this->get_filtered_price_new();
//			} else {
			$prices = $this->get_filtered_price( $meta_query_sql, $tax_query_sql, $filter_price_query_vars );
//			}
			if ( $prices && ( is_object( $prices ) || is_array( $prices ) ) ) {
				$min_price = $prices->min_price;
				$max_price = $prices->max_price;

				// Check to see if we should add taxes to the prices if store are excl tax but display incl.
				$tax_display_mode = get_option( 'woocommerce_tax_display_shop' );

				if ( wc_tax_enabled() && ! wc_prices_include_tax() && 'incl' === $tax_display_mode ) {
					$tax_class = apply_filters( 'woocommerce_price_filter_widget_tax_class', '' ); // Uses standard tax class.
					$tax_rates = WC_Tax::get_rates( $tax_class );

					if ( $tax_rates ) {
						$min_price += WC_Tax::get_tax_total( WC_Tax::calc_exclusive_tax( $min_price, $tax_rates ) );
						$max_price += WC_Tax::get_tax_total( WC_Tax::calc_exclusive_tax( $max_price, $tax_rates ) );
					}
				}
				$min_price = apply_filters( 'woocommerce_price_filter_widget_min_amount', floor( $min_price / $step ) * $step );
				$max_price = apply_filters( 'woocommerce_price_filter_widget_max_amount', ceil( $max_price / $step ) * $step );

				$current_min_price = isset( $_POST['min_price'] ) ? floor( floatval( wp_unslash( $_POST['min_price'] ) ) / $step ) * $step : $min_price; // WPCS: input var ok, CSRF ok.
				$current_max_price = isset( $_POST['max_price'] ) ? ceil( floatval( wp_unslash( $_POST['max_price'] ) ) / $step ) * $step : $max_price; // WPCS: input var ok, CSRF ok.
				$form_action       = isset( $_POST['wc_filter_price_action'] ) ? wc_clean( wp_unslash( $_POST['wc_filter_price_action'] ) ) : '';
				if ( empty( $form_action ) ) {
					if ( '' === get_option( 'permalink_structure' ) ) {
						$form_action = remove_query_arg( array(
							'page',
							'paged',
							'product-page'
						), add_query_arg( $wp->query_string, '', home_url( $wp->request ) ) );
					} else {
						$form_action = preg_replace( '%\/page/[0-9]+%', '', home_url( trailingslashit( $wp->request ) ) );
					}
				}
				ob_start();
				wc_get_template(
					'content-widget-price-filter.php',
					array(
						'form_action'       => $form_action,
						'step'              => $step,
						'min_price'         => $min_price,
						'max_price'         => $max_price,
						'current_min_price' => $current_min_price,
						'current_max_price' => $current_max_price,
					)
				);
				$custom_symbol = $data['custom'] ? str_replace('#PRICE#', $data['custom'], '') : '';
				$result['currency_symbol'] = $custom_symbol ? $custom_symbol : get_woocommerce_currency_symbol($current_currency);
				$result['wc_filter_price'] = ob_get_clean();
			}
		}

		do_action( 'wmc_get_products_price_ajax_handle_after' );
		wp_send_json_success( apply_filters( 'wmc_get_products_price_ajax_handle_response', $result ) );
	}

	public function change_price_format_by_specific_currency( $args ) {
		if ( count( $this->price_args ) ) {
			$args = wp_parse_args( $this->price_args, $args );
		}

		return $args;
	}

	public function remove_cache_mark_for_wc_price( $order_review ) {
		remove_filter( 'wc_price', [ $this, 'compatible_cache_plugin_by_json' ], 1000 );

		return $order_review;
	}

	public function add_cache_mark_for_wc_price( $message, $discount_available ) {
		add_filter( 'wc_price', array( $this, 'compatible_cache_plugin_by_json' ), 1000, 5 );

		return $message;
	}

	public function get_main_search_query_sql( $args ) {
		global $wpdb;

		$search_terms = isset( $args['search_terms'] ) ? $args['search_terms'] : array();
		$sql          = array();

		foreach ( $search_terms as $term ) {
			// Terms prefixed with '-' should be excluded.
			$include = '-' !== substr( $term, 0, 1 );

			if ( $include ) {
				$like_op  = 'LIKE';
				$andor_op = 'OR';
			} else {
				$like_op  = 'NOT LIKE';
				$andor_op = 'AND';
				$term     = substr( $term, 1 );
			}

			$like = '%' . $wpdb->esc_like( $term ) . '%';
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$sql[] = $wpdb->prepare( "(($wpdb->posts.post_title $like_op %s) $andor_op ($wpdb->posts.post_excerpt $like_op %s) $andor_op ($wpdb->posts.post_content $like_op %s))", $like, $like, $like );
		}

		if ( ! empty( $sql ) && ! is_user_logged_in() ) {
			$sql[] = "($wpdb->posts.post_password = '')";
		}

		return implode( ' AND ', $sql );
	}

	public function get_filtered_price( $meta_query_sql, $tax_query_sql, $filter_price_query_vars ) {
		global $wpdb;
		$search_query_sql = ! empty( $filter_price_query_vars ) ? self::get_main_search_query_sql( $filter_price_query_vars ) : '';
		$meta_query = new WP_Meta_Query( $meta_query_sql );
		$tax_query = new WP_Tax_Query( $tax_query_sql );
		$meta_query_sql   = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
		$tax_query_sql    = $tax_query->get_sql( $wpdb->posts, 'ID' );

		if ( empty( $meta_query_sql ) && empty( $tax_query_sql ) ) {
			$args       = WC()->query->get_main_query() ? WC()->query->get_main_query()->query_vars : array();
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

			$meta_query = new WP_Meta_Query( $meta_query );
			$tax_query  = new WP_Tax_Query( $tax_query );
			$search     = '';

			$meta_query_sql   = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
			$tax_query_sql    = $tax_query->get_sql( $wpdb->posts, 'ID' );
			$search_query_sql = $search ? ' AND ' . $search : '';
		}

		$sql = "
			SELECT min( min_price ) as min_price, MAX( max_price ) as max_price
			FROM {$wpdb->wc_product_meta_lookup}
			WHERE product_id IN (
				SELECT ID FROM {$wpdb->posts}
				" . $tax_query_sql['join'] . $meta_query_sql['join'] . "
				WHERE {$wpdb->posts}.post_type IN ('" . implode( "','", array_map( 'esc_sql', apply_filters( 'woocommerce_price_filter_post_type', array( 'product' ) ) ) ) . "')
				AND {$wpdb->posts}.post_status = 'publish'
				" . $tax_query_sql['where'] . $meta_query_sql['where'] . $search_query_sql . '
			)';

		$sql = apply_filters( 'woocommerce_price_filter_sql', $sql, $meta_query_sql, $tax_query_sql );

		return $wpdb->get_row( $sql );// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
	}

	protected function get_filtered_price_new() {
		global $wpdb;

		$args       = WC()->query->get_main_query()->query_vars;
		$tax_query  = isset( $args['tax_query'] ) ? $args['tax_query'] : array();
		$meta_query = isset( $args['meta_query'] ) ? $args['meta_query'] : array();

		if ( ! is_post_type_archive( 'product' ) && ! empty( $args['taxonomy'] ) && ! empty( $args['term'] ) ) {
			$tax_query[] = array(
				'taxonomy' => $args['taxonomy'],
				'terms'    => array( $args['term'] ),
				'field'    => 'slug',
			);
		}

		foreach ( $meta_query + $tax_query as $key => $query ) {
			if ( ! empty( $query['price_filter'] ) || ! empty( $query['rating_filter'] ) ) {
				unset( $meta_query[ $key ] );
			}
		}

		$meta_query = new WP_Meta_Query( $meta_query );
		$tax_query  = new WP_Tax_Query( $tax_query );
		$search     = WC_Query::get_main_search_query_sql();

		$meta_query_sql   = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
		$tax_query_sql    = $tax_query->get_sql( $wpdb->posts, 'ID' );
		$search_query_sql = $search ? ' AND ' . $search : '';

		$sql = "
				SELECT min( min_price ) as min_price, MAX( max_price ) as max_price
				FROM {$wpdb->wc_product_meta_lookup}
				WHERE product_id IN (
					SELECT ID FROM {$wpdb->posts}
					" . $tax_query_sql['join'] . $meta_query_sql['join'] . "
					WHERE {$wpdb->posts}.post_type IN ('" . implode( "','", array_map( 'esc_sql', apply_filters( 'woocommerce_price_filter_post_type', array( 'product' ) ) ) ) . "')
					AND {$wpdb->posts}.post_status = 'publish'
					" . $tax_query_sql['where'] . $meta_query_sql['where'] . $search_query_sql . '
				)';

		$sql = apply_filters( 'woocommerce_price_filter_sql', $sql, $meta_query_sql, $tax_query_sql );

		return $wpdb->get_row( $sql );// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
	}
}