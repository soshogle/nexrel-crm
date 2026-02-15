<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Admin_Settings {
	static $params;
	protected static $settings;
	protected static $language;
	protected static $languages;
	protected static $default_language;
	protected static $languages_data;

	public function __construct() {
		self::$settings         = WOOMULTI_CURRENCY_Data::get_ins();
		self::$languages        = array();
		self::$languages_data   = array();
		self::$default_language = '';
		add_action( 'admin_init', array( $this, 'save_settings' ) );
		add_action( 'wp_ajax_woomulticurrency_exchange', array( $this, 'woomulticurrency_exchange' ) );
		add_action( 'wp_ajax_wmc_fix_orders_missing_currency_info', array(
			$this,
			'fix_orders_missing_currency_info'
		) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ), 999 );
	}

	/**
	 * Add wmc_order_info for orders
	 */
	public function fix_orders_missing_currency_info() {
		check_ajax_referer( 'wmc-admin-settings-nonce', '_ajax_nonce' );
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Sorry you are not allowed to do this.' );
		}
		$wmc_order_info   = self::$settings->get_list_currencies();
		$default_currency = self::$settings->get_default_currency();

		$args     = array(
			'post_type'   => 'shop_order',
			'post_status' => array_keys( wc_get_order_statuses() ),
			'meta_query'  => array(// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'AND',
				array(
					'key'     => 'wmc_order_info',
					'compare' => 'NOT EXISTS',
				),
			),
			'orderby'     => 'ID',
			'order'       => 'ASC',
			'fields'      => 'ids',
		);
		$response = array(
			'status' => 'success',
			'result' => 0,
		);
		if ( isset( $_GET['check_orders'] ) ) {
			$args['posts_per_page'] = 1;
			$args['meta_query'][]   = array(// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'key'     => '_order_currency',
				'value'   => array_diff( array_keys( $wmc_order_info ), array( $default_currency ) ),
				'compare' => 'IN',
			);
			$the_query              = new WP_Query( $args );
			if ( $the_query->have_posts() ) {
				$response['result'] = 1;
			}
		} else {
			$args['posts_per_page'] = 50;
			$args['meta_query'][]   = array(// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'key'     => '_order_currency',
				'value'   => array_keys( $wmc_order_info ),
				'compare' => 'IN',
			);
			$the_query              = new WP_Query( $args );
			if ( $the_query->have_posts() ) {
				$order_ids                                      = $the_query->get_posts();
				$response['result']                             = $the_query->max_num_pages;
				$wmc_order_info[ $default_currency ]['is_main'] = 1;
				$now                                            = time();
				foreach ( $order_ids as $order_id ) {
					$line_order = wc_get_order( $order_id );
					if ( $line_order ) {
						$line_order->update_meta_data( 'wmc_order_info', $wmc_order_info );
						$line_order->update_meta_data( 'wmc_order_info_time', $now );
						$line_order->save_meta_data();
					}
				}
			}
		}
		wp_reset_postdata();
		wp_send_json( $response );
	}

	public static function page_callback() {
		self::$params = get_option( 'woo_multi_currency_params', array() );
		try {
			$has_block_page = WC_Blocks_Utils::has_block_in_page( wc_get_page_id( 'cart' ), 'woocommerce/cart' ) ||
			                  WC_Blocks_Utils::has_block_in_page( wc_get_page_id( 'checkout' ), 'woocommerce/checkout' );
		} catch ( Exception $e ) {
			$has_block_page = 0;
		}
		?>
        <div class="wrap woocommerce-multi-currency">
            <h2><?php esc_attr_e( 'Curcy - WooCommerce Multi Currency Settings', 'woocommerce-multi-currency' ) ?></h2>
            <form method="post" action="" class="vi-ui form">
				<?php
				echo ent2ncr( self::set_nonce() );// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				if ( count( self::$settings->get_list_currencies() ) > 1 ) {
					?>
                    <div class="vi-ui negative small message vi-wmc-orders-missing-currency-info-message">
                        <p>
							<?php esc_html_e( 'Some orders are missing currency info, which leads to incorrect revenue and orders statistics in analytics/report. Do you want to fix it by adding currency info for those orders using the current exchange rates?', 'woocommerce-multi-currency' ) ?>
                            <span class="vi-ui positive mini button vi-wmc-orders-missing-currency-info-fix"><?php esc_html_e( 'Yes, fix it please', 'woocommerce-multi-currency' ) ?></span>
                        </p>
                        <div class="vi-ui indicating progress small vi-wmc-progress">
                            <div class="label"><?php esc_html_e( 'Processing...', 'woocommerce-multi-currency' ) ?></div>
                            <div class="bar">
                                <div class="progress"></div>
                            </div>
                        </div>
                    </div>
					<?php
				}
				?>
                <div class="vi-ui attached tabular menu">
                    <div class="item active" data-tab="general">
						<?php esc_html_e( 'General', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="location">
						<?php esc_html_e( 'Location', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="checkout">
						<?php esc_html_e( 'Checkout', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="design">
						<?php esc_html_e( 'Design', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="codex">
						<?php esc_html_e( 'Codex', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="price">
						<?php esc_html_e( 'Price format', 'woocommerce-multi-currency' ) ?>
                    </div>
                    <div class="item" data-tab="update">
						<?php esc_html_e( 'Update', 'woocommerce-multi-currency' ) ?>
                    </div>
                </div>
                <div class="vi-ui bottom attached tab segment active" data-tab="general">
                    <!-- Tab Content !-->
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable' ) ) ?>">
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable' ) ) ?>"/>
                                    <label></label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_fixed_price' ) ) ?>">
									<?php esc_html_e( 'Fixed Price', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_fixed_price' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_fixed_price' ), 1 ) ?>
                                           tabindex="0" class="hidden wmc-fixed-price" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_fixed_price' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Set up product price in each currency manually, this price will overwrite the calculated price.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo sprintf( '<strong>%1$s </strong>%2$s',
										esc_html__( '*Important:', 'woocommerce-multi-currency' ),
										esc_html__( 'Even if you enable this option, you still have to Update/Config currency rates properly because rates will be used in case fixed product price/shipping cost is not set for a currency.', 'woocommerce-multi-currency' ) ) ?></p>
                                <p class="description"><?php echo sprintf( '<strong>%1$s </strong>%2$s',
										esc_html__( '*Note:', 'woocommerce-multi-currency' ),
										esc_html__( 'To make fixed shipping cost apply to a specific currency, you have to explicitly set all available cost fields in that currency if the respective field in default currency is not empty.', 'woocommerce-multi-currency' ) ) ?></p>
                            </td>
                        </tr>
                        <tr class="wmc-ignore-exchange-rate-row">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'ignore_exchange_rate' ) ) ?>">
									<?php esc_html_e( "Don't use exchange rate", 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'ignore_exchange_rate' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'ignore_exchange_rate' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'ignore_exchange_rate' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( "If enabled, products without fixed prices are not automatically converted by the exchange rate", 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <!--                        <tr>-->
                        <!--                            <th>-->
                        <!--                                <label for="-->
						<?php //echo esc_attr( self::set_field( 'use_session' ) ) ?><!--">-->
                        <!--									--><?php //esc_html_e( 'Use SESSION', 'woocommerce-multi-currency' ) ?>
                        <!--                                </label>-->
                        <!--                            </th>-->
                        <!--                            <td>-->
                        <!--                                <div class="vi-ui toggle checkbox">-->
                        <!--                                    <input id="-->
						<?php //echo esc_attr( self::set_field( 'use_session' ) ) ?><!--"-->
                        <!--                                           type="checkbox" --><?php //checked( self::get_field( 'use_session' ), 1 ) ?>
                        <!--                                           tabindex="0" class="hidden" value="1"-->
                        <!--                                           name="-->
						<?php //echo esc_attr( self::set_field( 'use_session' ) ) ?><!--"/>-->
                        <!--                                    <label></label>-->
                        <!--                                </div>-->
                        <!--                                <p class="description">-->
						<?php //esc_html_e( 'Use SESSION instead of COOKIE.', 'woocommerce-multi-currency' ) ?><!--</p>-->
                        <!--                            </td>-->
                        <!--                        </tr>-->
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'set_storage' ) ) ?>">
									<?php esc_html_e( 'Data storage method', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php
								$set_storage = self::$settings->use_session();
								?>
                                <select name="<?php echo esc_attr( self::set_field( 'set_storage' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $set_storage, 'cookie' ) ?>
                                            value="cookie"><?php esc_html_e( 'Cookie', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $set_storage, 'session' ) ?>
                                            value="session"><?php esc_html_e( 'Session', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $set_storage, 'woo_session' ) ?>
                                            value="woo_session"><?php esc_html_e( 'WooCommerce Session (beta)', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $set_storage, 'transient' ) ?>
                                            value="transient"><?php esc_html_e( 'Transient (beta)', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'On certain servers, some storage methods may cause the selected currency to reset to the default after selection. If this occurs, try using a different storage method.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_switch_currency_by_js' ) ) ?>">
									<?php esc_html_e( 'Switch Currency by JS', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_switch_currency_by_js' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_switch_currency_by_js' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_switch_currency_by_js' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Enable this option if you don\'t want to add "?wmc-currency={currency}" to url of currency switcher buttons.', 'woocommerce-multi-currency' );//Now It is not compatible with Caching plugins.?></p>
                            </td>
                        </tr>
						<?php
						/*
						?>
						<tr class="wmc-switch-currency-by-js-dependency">
							<th>
								<label for="<?php echo esc_attr( self::set_field( 'do_not_reload_page' ) ) ?>">
									<?php esc_html_e( 'Do not reload page', 'woocommerce-multi-currency' ) ?>
								</label>
							</th>
							<td>
								<div class="vi-ui toggle checkbox">
									<input id="<?php echo esc_attr( self::set_field( 'do_not_reload_page' ) ) ?>"
										   type="checkbox" <?php checked( self::get_field( 'do_not_reload_page' ), 1 ) ?>
										   tabindex="0" class="hidden" value="1"
										   name="<?php echo esc_attr( self::set_field( 'do_not_reload_page' ) ) ?>"/>
									<label></label>
								</div>
								<p class="description"><?php esc_html_e( 'Do not reload page after switching currency', 'woocommerce-multi-currency' );//Now It is not compatible with Caching plugins.?></p>
							</td>
						</tr>
						<?php
*/
						?>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'cache_compatible' ) ) ?>">
									<?php esc_html_e( 'Use cache plugin', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php
								$cache_compatible = self::get_field( 'cache_compatible' );
								?>

                                <select name="<?php echo esc_attr( self::set_field( 'cache_compatible' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $cache_compatible, 0 ) ?>
                                            value="0"><?php esc_html_e( 'None', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $cache_compatible, 1 ) ?>
                                            value="1"><?php esc_html_e( 'Override by AJAX', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $cache_compatible, 2 ) ?>
                                            value="2"><?php esc_html_e( 'Override by JSON', 'woocommerce-multi-currency' ) ?></option>
                                </select>

                                <p class="description">
									<?php esc_html_e( 'Enable this if you are using a caching plugin(WP Super cache, W3 total cache, WP rocket, ...) and currency does not remain after being switched by customers in the frontend', 'woocommerce-multi-currency' ) ?>
                                </p>

                                <strong><?php esc_html_e( 'Note for use JSON option', 'woocommerce-multi-currency' ) ?>
                                    :</strong>

                                <p class="description">
                                    - <?php esc_html_e( 'Disable "Use SESSION" option above"', 'woocommerce-multi-currency' ) ?>
                                </p>
                                <p class="description">
                                    - <?php esc_html_e( "It is not working with Approximate & Fixed price option.", 'woocommerce-multi-currency' ) ?>
                                </p>
                            </td>
                        </tr>

                        <tr class="wmc-ajax-filter-price-row">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'load_ajax_filter_price' ) ) ?>">
									<?php esc_html_e( 'Reload filter price', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'load_ajax_filter_price' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'load_ajax_filter_price' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'load_ajax_filter_price' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Reset price filter when loading via AJAX', 'woocommerce-multi-currency' );//Now It is not compatible with Caching plugins.?></p>
                            </td>
                        </tr>

                        <tr class="wmc-ajax-filter-price-row">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'loading_price_mask' ) ) ?>">
									<?php esc_html_e( 'Loading price mask', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'loading_price_mask' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'loading_price_mask' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'loading_price_mask' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Add loading layer when loading price via AJAX', 'woocommerce-multi-currency' );//Now It is not compatible with Caching plugins.?></p>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'bot_currency' ) ) ?>">
									<?php esc_html_e( 'Bot currency', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
							<?php
							$bot_currency = self::$settings->get_params( 'bot_currency' );
							?>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'bot_currency' ) ) ?>"
                                        class="vi-ui dropdown fluid vi-wmc-bot-currency">
                                    <option value=""><?php esc_html_e( 'Not set', 'woocommerce-multi-currency' ) ?></option>
                                    <option value="default_currency" <?php selected( $bot_currency, 'default_currency' ) ?>><?php esc_html_e( 'Default currency', 'woocommerce-multi-currency' ) ?></option>
									<?php
									foreach ( self::$settings->get_list_currencies() as $bot_currency_k => $bot_currency_v ) {
										$currency_symbol = get_woocommerce_currency_symbol( $bot_currency_k );
										?>
                                        <option <?php selected( $bot_currency, $bot_currency_k ) ?>
                                                value="<?php echo esc_attr( $bot_currency_k ) ?>"><?php echo esc_html( $bot_currency_k ) . ' (' . esc_html( $currency_symbol ) . ')' ?></option>
										<?php
									}
									?>
                                </select>
                                <p class="description">
									<?php esc_html_e( 'Select the currency that you want to show to Bots(web crawler tools) when they crawl your site. If not set, Bots will be treated like normal visitors which means that the auto-detect currency(if enabled) will also apply to them.', 'woocommerce-multi-currency' ) ?>
                                </p>
                                <p class="description">
									<?php echo sprintf( '<strong>%1$s</strong>%2$s <strong>wmc-currency</strong> %3$s <strong>%4$s</strong> %5$s',
										esc_html__( '*Note: ', 'woocommerce-multi-currency' ),
										esc_html__( 'If the page URL contains', 'woocommerce-multi-currency' ),
										esc_html__( 'or', 'woocommerce-multi-currency' ),
										esc_html__( 'currency', 'woocommerce-multi-currency' ),
										esc_html__( 'parameters (which hold a currency code in uppercase), the value of those parameters will be used instead of this option.', 'woocommerce-multi-currency' ) ) ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'fixed_structure_currency' ) ) ?>">
									<?php esc_html_e( 'Fixed Structure currency', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
							<?php
							$fixed_structure_currency = self::$settings->get_params( 'fixed_structure_currency' );
							?>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'fixed_structure_currency' ) ) ?>"
                                        class="vi-ui dropdown fluid vi-wmc-bot-currency">
                                    <option value="unset"><?php esc_html_e( 'Not set', 'woocommerce-multi-currency' ) ?></option>
                                    <option value="default" <?php selected( $fixed_structure_currency, 'default' ) ?>><?php esc_html_e( 'Default currency', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description">
									<?php esc_html_e( 'Fixed currency in schema structure data.', 'woocommerce-multi-currency' ) ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th colspan="2">
                                <label for="<?php echo esc_attr( self::set_field( 'enable_mobile' ) ) ?>">
									<?php esc_html_e( 'Currency Options', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                        </tr>
                        <tr>
                            <td colspan="2">

                                <table class="vi-ui table wmc-currency-options">
                                    <thead>
                                    <tr>
                                        <th class="one wide"><?php esc_html_e( 'Default', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="one wide"><?php esc_html_e( 'Hidden', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="two wide"><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="two wide"><?php esc_html_e( 'Position', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="four wide"
                                            colspan="2"><?php esc_html_e( 'Rate + Exchange Fee', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="two wide"><?php esc_html_e( 'Number of Decimals', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="two wide"><?php esc_html_e( 'Custom symbol', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="one wide"><?php esc_html_e( 'Thousand separator', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="one wide"><?php esc_html_e( 'Decimal separator', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="one wide"><?php esc_html_e( 'Action', 'woocommerce-multi-currency' ) ?></th>
                                    </tr>
                                    </thead>
                                    <tbody>
									<?php

									$currencies                  = self::get_field( 'currency', array( get_option( 'woocommerce_currency' ) ) );
									$currency_pos                = self::get_field( 'currency_pos', array( get_option( 'woocommerce_currency_pos' ) ) );
									$currency_rate               = self::get_field( 'currency_rate', array( 1 ) );
									$currency_rate_fee           = self::get_field( 'currency_rate_fee', array( 0.0000 ) );
									$currency_rate_fee_type      = self::get_field( 'currency_rate_fee_type', array( 'fixed' ) );
									$currency_decimals           = self::get_field( 'currency_decimals', array( get_option( 'woocommerce_price_num_decimals' ) ) );
									$currency_custom             = self::get_field( 'currency_custom', array() );
									$currency_thousand_separator = self::get_field( 'currency_thousand_separator', array() );
									$currency_decimal_separator  = self::get_field( 'currency_decimal_separator', array() );
									$currency_hidden             = self::get_field( 'currency_hidden', array() );

									if ( is_array( $currencies ) ) {
										if ( count( array_filter( $currencies ) ) < 1 ) {
											$currencies                  = array();
											$currency_pos                = array();
											$currency_rate               = array();
											$currency_rate_fee           = array();
											$currency_rate_fee_type      = array();
											$currency_decimals           = array();
											$currency_custom             = array();
											$currency_thousand_separator = array();
											$currency_decimal_separator  = array();
										}
									} else {
										$currencies                  = array();
										$currency_pos                = array();
										$currency_rate               = array();
										$currency_rate_fee           = array();
										$currency_rate_fee_type      = array();
										$currency_decimals           = array();
										$currency_custom             = array();
										$currency_thousand_separator = array();
										$currency_decimal_separator  = array();
									}
									$wc_currencies = get_woocommerce_currencies();
									foreach ( $currencies as $key => $currency ) {
										$current_currency_symbol = get_woocommerce_currency_symbol( $currency );
										if ( self::get_field( 'currency_default', get_option( 'woocommerce_currency' ) ) == $currency ) {
											$disabled = 'readonly';
										} else {
											$disabled = '';
										}
										?>
                                        <tr class="wmc-currency-data <?php echo esc_attr( $currency ) . '-currency' ?>">
                                            <td class="collapsing">
                                                <div class="vi-ui toggle checkbox">
                                                    <input type="radio" <?php checked( self::get_field( 'currency_default', get_option( 'woocommerce_currency' ) ), $currency ) ?>
                                                           tabindex="0" class="hidden"
                                                           value="<?php echo esc_attr( $currency ) ?>"
                                                           name="<?php echo esc_attr( self::set_field( 'currency_default' ) ) ?>"/>
                                                    <label></label>
                                                </div>
                                            </td>
                                            <td class="collapsing"
                                                title="<?php esc_attr_e( 'Hide currencies on widget, shortcode and sidebar', 'woocommerce-multi-currency' ) ?>"
                                                data-tooltip="<?php esc_attr_e( 'Hide currencies on widget, shortcode and sidebar', 'woocommerce-multi-currency' ) ?>">
                                                <select name="<?php echo esc_attr( self::set_field( 'currency_hidden', 1 ) ) ?>">
                                                    <option <?php selected( self::data_isset( $currency_hidden, $key, 0 ), 0 ) ?>
                                                            value="0"><?php esc_html_e( 'No', 'woocommerce-multi-currency' ) ?></option>
                                                    <option <?php selected( self::data_isset( $currency_hidden, $key ), 1 ) ?>
                                                            value="1"><?php esc_html_e( 'Yes', 'woocommerce-multi-currency' ) ?></option>
                                                </select>
                                            </td>
                                            <td>
                                                <select name="<?php echo esc_attr( self::set_field( 'currency', 1 ) ) ?>"
                                                        class="vi-ui select2 wmc-currency-option-select">
													<?php
													foreach ( $wc_currencies as $k => $wc_currency ) {
														$currency_symbol = get_woocommerce_currency_symbol( $k );
														?>
                                                        <option <?php selected( $currency, $k ) ?>
                                                                data-currency_symbol="<?php echo esc_attr( $currency_symbol ) ?>"
                                                                value="<?php echo esc_attr( $k ) ?>"><?php echo esc_html( $k ) . '-' . esc_html( $wc_currency ) . ' (' . esc_html( $currency_symbol ) . ')' ?></option>
														<?php
													}
													?>
                                                </select>
                                            <td>
                                                <select name="<?php echo esc_attr( self::set_field( 'currency_pos', 1 ) ) ?>"
                                                        data-currency_symbol="<?php echo esc_attr( $current_currency_symbol ) ?>">
                                                    <option <?php selected( self::data_isset( $currency_pos, $key ), 'left' ) ?>
                                                            value="left"><?php /* translators: %s: currency symbol */
														printf( esc_html__( 'Left %s99', 'woocommerce-multi-currency' ), esc_html( $current_currency_symbol ) ) ?></option>
                                                    <option <?php selected( self::data_isset( $currency_pos, $key ), 'right' ) ?>
                                                            value="right"><?php /* translators: %s: currency symbol */
														printf( esc_html__( 'Right 99%s', 'woocommerce-multi-currency' ), esc_html( $current_currency_symbol ) ) ?></option>
                                                    <option <?php selected( self::data_isset( $currency_pos, $key ), 'left_space' ) ?>
                                                            value="left_space"><?php /* translators: %s: currency symbol */
														printf( esc_html__( 'Left with space %s 99', 'woocommerce-multi-currency' ), esc_html( $current_currency_symbol ) ) ?></option>
                                                    <option <?php selected( self::data_isset( $currency_pos, $key ), 'right_space' ) ?>
                                                            value="right_space"><?php /* translators: %s: currency symbol */
														printf( esc_html__( 'Right with space 99 %s', 'woocommerce-multi-currency' ), esc_html( $current_currency_symbol ) ) ?></option>
                                                </select>
                                            </td>
                                            <td>

                                                <input <?php echo esc_attr( $disabled ) ?> required="required"
                                                                                           type="text"
                                                                                           class="wmc-currency-rate"
                                                                                           name="<?php echo esc_attr( self::set_field( 'currency_rate', 1 ) ) ?>"
                                                                                           value="<?php echo esc_attr( self::data_isset( $currency_rate, $key, '1' ) ) ?>"/>

                                            </td>
                                            <td>
                                                <div class="vi-ui left icon input right labeled"
                                                     data-tooltip="<?php esc_attr_e( 'If Exchange fee is fixed, final rate will be Rate plus Exchange fee. Eg: Rate is 1.62, Exchange fee is 0.1(fixed) => Final rate = 1.62 + 0.1 = 1.72', 'woocommerce-multi-currency' ) ?>">
                                                    <i class="vi-ui icon plus"></i>
                                                    <input <?php echo esc_attr( $disabled ) ?> type="number"
                                                                                               class="wmc-currency-rate-fee"
                                                                                               name="<?php echo esc_attr( self::set_field( 'currency_rate_fee', 1 ) ) ?>"
                                                                                               value="<?php echo esc_attr( self::data_isset( $currency_rate_fee, $key, '0.0000' ) ) ?>"
                                                                                               step="any"/>

                                                    <select name="<?php echo esc_attr( self::set_field( 'currency_rate_fee_type', 1 ) ) ?>">
                                                        <option value="fixed" <?php selected( self::data_isset( $currency_rate_fee_type, $key ), 'fixed' ) ?>><?php esc_html_e( 'fixed', 'woocommerce-multi-currency' ) ?></option>
                                                        <option value="percentage" <?php selected( self::data_isset( $currency_rate_fee_type, $key ), 'percentage' ) ?>>
                                                            %
                                                        </option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td>
                                                <input type="text"
                                                       name="<?php echo esc_attr( self::set_field( 'currency_decimals', 1 ) ) ?>"
                                                       value="<?php echo esc_attr( self::data_isset( $currency_decimals, $key, '2' ) ) ?>"/>
                                            </td>
                                            <td>
                                                <input type="text" placeholder="eg: CAD $"
                                                       class="wmc-currency-custom-symbol"
                                                       name="<?php echo esc_attr( self::set_field( 'currency_custom', 1 ) ) ?>"
                                                       value="<?php echo esc_attr( self::data_isset( $currency_custom, $key ) ) ?>"/>
                                            </td>
                                            <td>
                                                <input type="text" placeholder=""
                                                       class="wmc-currency-thousand-separator"
                                                       name="<?php echo esc_attr( self::set_field( 'currency_thousand_separator', 1 ) ) ?>"
                                                       value="<?php echo esc_attr( self::data_isset( $currency_thousand_separator, $key ) ) ?>"/>
                                            </td>
                                            <td>
                                                <input type="text" placeholder=""
                                                       class="wmc-currency-decimal-separator"
                                                       name="<?php echo esc_attr( self::set_field( 'currency_decimal_separator', 1 ) ) ?>"
                                                       value="<?php echo esc_attr( self::data_isset( $currency_decimal_separator, $key ) ) ?>"/>
                                            </td>
                                            <td>
                                                <div class="vi-ui buttons">
                                                    <div class="wmc-update-rate-wrap"
                                                         title="<?php esc_attr_e( 'Update Rate', 'woocommerce-multi-currency' ) ?>"
                                                         data-tooltip="<?php esc_attr_e( 'Update Rate', 'woocommerce-multi-currency' ) ?>">
                                                        <div class="vi-ui small icon button wmc-update-rate">
                                                            <i class="cloud download icon"></i>
                                                        </div>
                                                    </div>
                                                    <div class="vi-ui small icon red button wmc-remove-currency"
                                                         title="<?php esc_attr_e( 'Remove', 'woocommerce-multi-currency' ) ?>"
                                                         data-tooltip="<?php esc_attr_e( 'Remove', 'woocommerce-multi-currency' ) ?>">
                                                        <i class="trash icon"></i>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
									<?php } ?>

                                    </tbody>
                                    <tfoot class="full-width">
                                    <tr>

                                        <th colspan="9">
                                            <button name="woo_multi_currency_params[delete_all_currencies]"
                                                    class="vi-ui right floated red labeled icon button">
                                                <i class="trash icon"></i> <?php esc_html_e( 'Remove All Currencies', 'woocommerce-multi-currency' ) ?>
                                            </button>
                                            <button name="woo_multi_currency_params[add_all_currencies]"
                                                    class="vi-ui right floated green labeled icon button">
                                                <i class="money outline icon"></i> <?php esc_html_e( 'Add All Currencies', 'woocommerce-multi-currency' ) ?>
                                            </button>
                                            <div class="vi-ui right floated green labeled icon button wmc-add-currency">
                                                <i class="money icon"></i> <?php esc_html_e( 'Add Currency', 'woocommerce-multi-currency' ) ?>
                                            </div>
                                            <div class="vi-ui right floated labeled icon button wmc-update-rates">
                                                <i class="in cart icon"></i> <?php esc_html_e( 'Update All Rates', 'woocommerce-multi-currency' ) ?>
                                            </div>

                                        </th>
                                    </tr>
                                    </tfoot>
                                </table>

                                <p class="vi-ui message yellow"><?php esc_html_e( 'Custom symbol: You can set custom symbol for each currency in your list and how to it will be displayed (used when you have many currency have same symbol). Leave it empty to used default symbol. Example: if you set US$ for US dollar, system will display US$100 instead of $100 like default. Or you can use with parameter #PRICE# to display price in special format, example: if you set US #PRICE# $, system will display: US 100 $.', 'woocommerce-multi-currency' ) ?></p>
								<?php
								if ( $has_block_page ) { ?>
                                    <p class="vi-ui message yellow"><?php esc_html_e( 'When use WC cart/checkout block, parameter #PRICE# will not work, please use custom symbol with no parameter', 'woocommerce-multi-currency' ) ?></p>
								<?php }
								?>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <!-- Location !-->
                <div class="vi-ui bottom attached tab segment" data-tab="location">
                    <!-- Tab Content !-->
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'auto_detect' ) ) ?>">
									<?php esc_html_e( 'Auto Detect', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'auto_detect' ) ) ?>"
                                        class="vi-ui dropdown fluid wmc-auto-detect">
                                    <option <?php selected( self::get_field( 'auto_detect' ), 0 ) ?>
                                            value="0"><?php esc_html_e( 'No', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'auto_detect' ), 1 ) ?>
                                            value="1"><?php esc_html_e( 'Auto select currency', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'auto_detect' ), 5 ) ?>
                                            value="5"><?php esc_html_e( 'Initial currency', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'auto_detect' ), 2 ) ?>
                                            value="2"><?php esc_html_e( 'Approximate Price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'auto_detect' ), 3 ) ?>
                                            value="3"><?php esc_html_e( 'Language Polylang', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'auto_detect' ), 4 ) ?>
                                            value="4"><?php esc_html_e( 'TranslatePress Multilingual', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'If the option is set to Auto-select currency and Geo API is WooCommerce or External, when the user goes to the website for the first time, the website will take time to detect currency and make the site a bit slow.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr class="wmc-order-preview-row" <?php if ( self::get_field( 'auto_detect' ) != 2 ) {
							echo esc_attr( 'style=display:none;' );
						} ?>>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'approximate_position' ) ) ?>">
									<?php esc_html_e( 'Show Approximate price for', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'approximate_position', 1 ) ) ?>"
                                        class="vi-ui dropdown fluid wmc-order-preview" multiple>
									<?php
									$options   = array(
										'product'          => esc_html__( 'Product in cart', 'woocommerce-multi-currency' ),
										'product_subtotal' => esc_html__( 'Product subtotal', 'woocommerce-multi-currency' ),
										'shipping'         => esc_html__( 'Shipping', 'woocommerce-multi-currency' ),
										'tax'              => esc_html__( 'Tax', 'woocommerce-multi-currency' ),
										'subtotal'         => esc_html__( 'Subtotal', 'woocommerce-multi-currency' ),
										'total'            => esc_html__( 'Total', 'woocommerce-multi-currency' ),
										'total_thankyou'   => esc_html__( 'Total(Thank-you page)', 'woocommerce-multi-currency' ),
									);
									$_selected = self::get_field( 'approximate_position', array() );
									foreach ( $options as $key => $option ) {
										$selected = in_array( $key, $_selected ) ? 'selected' : '';
										echo sprintf( "<option value='%1s' %2s>%3s</option>", esc_attr( $key ), esc_attr( $selected ), esc_html( $option ) );
									} ?>
                                </select>
                                <p class="description"><?php esc_html_e( 'Besides product price, if you want to show approximate price for cart elements on cart/checkout page, please select them here', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr class="wmc-order-preview-row" <?php if ( self::get_field( 'auto_detect' ) != 2 ) {
							echo esc_attr( 'style=display:none;' );
						} ?>>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'approximately_label' ) ) ?>">
									<?php esc_html_e( 'Approximate price\'s label', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text"
                                       name="<?php echo esc_attr( self::set_field( 'approximately_label' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'approximately_label', 'Approximately:' ) ) ?>"/>
                                <p class="description"><?php esc_html_e( 'Use {price} to display price in special format. Example: (~ {price})', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr class="wmc-order-preview-row" <?php if ( self::get_field( 'auto_detect' ) != 2 ) {
							echo esc_attr( 'style=display:none;' );
						} ?>>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'approximately_priority' ) ) ?>">
									<?php esc_html_e( 'Approximate price\'s position', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'approximately_priority' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( self::get_field( 'approximately_priority' ), 0 ) ?>
                                            value="0"><?php esc_html_e( 'Below original price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'approximately_priority' ), 1 ) ?>
                                            value="1"><?php esc_html_e( 'Above original price', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr class="wmc-initial-currency-row" <?php if ( self::get_field( 'auto_detect' ) != 5 ) {
							echo esc_attr( 'style=display:none;' );
						} ?>>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'initial_currency' ) ) ?>">
									<?php esc_html_e( 'Initial currency', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'initial_currency' ) ) ?>"
                                        class="vi-ui dropdown fluid">
									<?php
									foreach ( self::$settings->get_currencies() as $v_crr ) {
										printf( '<option %1$s value="%2$s">%3$s</option>',
											selected( self::get_field( 'initial_currency' ), $v_crr ), esc_attr( $v_crr ), esc_attr( $v_crr ) ) ?>

									<?php } ?>
                                </select>
                            </td>
                        </tr>
                        <tr class="wmc-user-login-switch" <?php if ( in_array( self::get_field( 'auto_detect' ), [
							2,
							3,
							4
						] ) ) {
							echo esc_attr( 'style=display:none;' );
						} ?>">
                        <th>
                            <label for="<?php echo esc_attr( self::set_field( 'user_login_switch' ) ) ?>">
								<?php esc_html_e( 'Switch when user login', 'woocommerce-multi-currency' ) ?>
                            </label>
                        </th>
                        <td>
                            <select name="<?php echo esc_attr( self::set_field( 'user_login_switch' ) ) ?>"
                                    class="vi-ui dropdown fluid">
                                <option <?php selected( self::get_field( 'user_login_switch' ), 0 ) ?>
                                        value="0"><?php esc_html_e( 'No', 'woocommerce-multi-currency' ) ?></option>
                                <option <?php selected( self::get_field( 'user_login_switch' ), 1 ) ?>
                                        value="1"><?php esc_html_e( 'Billing Address', 'woocommerce-multi-currency' ) ?></option>
                                <option <?php selected( self::get_field( 'user_login_switch' ), 2 ) ?>
                                        value="2"><?php esc_html_e( 'Shipping Address', 'woocommerce-multi-currency' ) ?></option>
                                <option <?php selected( self::get_field( 'user_login_switch' ), 3 ) ?>
                                        value="3"><?php esc_html_e( 'Billing, if empty, select Shipping', 'woocommerce-multi-currency' ) ?></option>
                                <option <?php selected( self::get_field( 'user_login_switch' ), 4 ) ?>
                                        value="4"><?php esc_html_e( 'Shipping, if empty, select Billing', 'woocommerce-multi-currency' ) ?></option>
                            </select>
                            <p class="description"><?php esc_html_e( 'Switch currency by user address when user login', 'woocommerce-multi-currency' ) ?></p>
                        </td>
                        </tr>
						<?php do_action( 'wmc_admin_settings_before_geo_api' ); ?>
                        <tr>

                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'geo_api' ) ) ?>">
									<?php esc_html_e( 'Geo API', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'geo_api' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( self::get_field( 'geo_api' ), 0 ) ?>
                                            value="0"><?php esc_html_e( 'WooCommerce Geolocation', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'geo_api' ), 1 ) ?>
                                            value="1"><?php esc_html_e( 'External', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'geo_api' ), 2 ) ?>
                                            value="2"><?php esc_html_e( 'Inherited from server', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'geo_api' ), 3 ) ?>
                                            value="3"><?php esc_html_e( 'MaxMind Geolocation (WooCommerce Integration)', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'API will help detect customer country code based on IP address.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php /* translators: %s: Server country code data */
									printf( esc_html__( 'Some servers support GEO IP. Only use "Inherited from server" if you go to System status and see that the $_SERVER variable contains one of these parameters %s and their values show your correct country code', 'woocommerce-multi-currency' ), esc_html( implode( ', ', WOOMULTI_CURRENCY_Data::country_code_key_from_headers() ) ) ) ?></p>
                                <p class="description"><?php esc_html_e( 'If you want to use MaxMind Geolocation, go to WooCommerce > Setting set Default customer location as Geolocate and go to WooCommerce > Setting > Integration set MaxMind License Key to use that API', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Please note that site speed may experience a slight slowdown upon the initial visit if WooCommerce or External elements are utilized.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'MaxMind and Inherited server is the fastest way.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr class="wmc-external-geo-api-key-row" <?php if ( self::get_field( 'geo_api' ) != 1 ) {
	                        echo esc_attr( 'style=display:none;' );
                        } ?>>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'geo_api_key' ) ) ?>">
			                        <?php esc_html_e( 'External geo api key', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text" name="<?php echo esc_attr( self::set_field( 'geo_api_key' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'geo_api_key', '' ) ) ?>"/>
                                <p class="description"><?php printf('%s <a href="%s">ip2location.io</a> %s',
                                        esc_html__( 'Go to', 'woocommerce-multi-currency' ),
                                        esc_url( 'https://www.ip2location.io/' ),
                                        esc_html__( 'create account and paste API Key here to use.', 'woocommerce-multi-currency' ) ); ?></p>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_currency_by_country' ) ) ?>">
									<?php esc_html_e( 'Currency by Country', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_currency_by_country' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_currency_by_country' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_currency_by_country' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'If "Auto Detect" option is set to Auto select currency, currency will be selected based on country.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'If "Auto Detect" option is set to Approximate Price, approximate price will be in the detected country\'s official currency if this option is disabled and will be the detected country\'s respective currency below if this option is enabled', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>

                        <tr>

                            <td colspan="2">
                                <table class="vi-ui table">
                                    <thead>
                                    <tr>
                                        <th class="two wide"><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        <th><?php esc_html_e( 'Countries', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="four wide"><?php esc_html_e( 'Actions', 'woocommerce-multi-currency' ) ?></th>
                                    </tr>
                                    </thead>
                                    <tbody>
									<?php
									$wc_countries = $countries = WC()->countries->get_countries();
									foreach ( $currencies as $key => $currency ) {
										?>
                                        <tr>
                                            <td><?php echo esc_html( '(' . get_woocommerce_currency_symbol( $currency ) . ') ' . $currency ) ?></td>
                                            <td>
                                                <select multiple="multiple"
                                                        name="<?php echo esc_attr( self::set_field( $currency . '_by_country', 1 ) ) ?>"
                                                        class="vi-ui select2-multiple"
                                                        data-placeholder="<?php esc_attr_e( 'Please select countries', 'woocommerce-multi-currency' ) ?>">
													<?php
													$countries_assign = self::get_field( $currency . '_by_country', array() );
													foreach ( $wc_countries as $k => $wc_country ) {
														$selected = '';

														if ( in_array( $k, $countries_assign ) ) {
															$selected = 'selected="selected"';
														}

														?>
                                                        <option <?php echo esc_attr( $selected ) ?>
                                                                value="<?php echo esc_attr( $k ) ?>">
															<?php echo esc_html( $wc_country ) ?></option>
													<?php } ?>
                                                </select>

                                            </td>
                                            <td>
                                                <div class="vi-ui mini button wmc-select-all-countries">
													<?php esc_html_e( 'Select all', 'woocommerce-multi-currency' ) ?>
                                                </div>
                                                <div class="vi-ui mini red button wmc-remove-all-countries">
													<?php esc_html_e( 'Remove All', 'woocommerce-multi-currency' ) ?>
                                                </div>
                                            </td>
                                        </tr>
										<?php
									}
									?>
                                    </tbody>
                                    <tfoot>
                                    <tr>
                                        <th colspan="3">
                                            <button class="vi-ui mini green button"
                                                    name="woo_multi_currency_params[wmc_get_country_by_currency]">
												<?php esc_html_e( 'Get country by currency', 'woocommerce-multi-currency' ); ?>
                                            </button>
                                        </th>
                                    </tr>
                                    </tfoot>
                                </table>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <!--					Polylang-->
					<?php
					if ( class_exists( 'TRP_Translate_Press' ) ) {
						?>
                        <h3>
							<?php esc_html_e( 'TranslatePress - Multilingual', 'woocommerce-multi-currency' ) ?>
                        </h3>
                        <table class="optiontable form-table">
                            <tr>
                                <th>
                                    <label>
										<?php esc_html_e( 'Language switcher', 'woocommerce-multi-currency' ) ?>
                                    </label>
                                </th>
                                <td>
                                    <table class="vi-ui table">
                                        <thead>
                                        <tr>
                                            <th class="four wide"><?php esc_html_e( 'Language', 'woocommerce-multi-currency' ) ?></th>
                                            <th><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        </tr>
                                        </thead>
                                        <tbody>
										<?php
										$trp            = TRP_Translate_Press::get_trp_instance();
										$trp_languages  = $trp->get_component( 'languages' )->get_languages( 'english_name' );
										$trp_settings   = ( new TRP_Settings() )->get_settings();
										$languages      = isset( $trp_settings['translation-languages'] ) ? $trp_settings['translation-languages'] : array();
										$trp_currencies = self::$settings->get_params( 'translatepress' );
										foreach ( $languages as $language ) {
											?>
                                            <tr>
                                                <td><?php echo '"' . esc_html( $trp_languages[ $language ] ) . '(' . esc_html( $language ) . ')"' ?></td>
                                                <td>
                                                    <select name="<?php echo esc_attr( "woo_multi_currency_params[translatepress][{$language}]" ) ?>"
                                                            class="vi-ui"
                                                            data-placeholder="<?php esc_attr_e( 'Please select currency', 'woocommerce-multi-currency' ) ?>">
                                                        <option value="0"><?php echo esc_html__( 'Default', 'woocommerce-multi-currency' ) ?></option>
														<?php
														$l_currency = isset( $trp_currencies[ $language ] ) ? $trp_currencies[ $language ] : '';
														foreach ( $currencies as $currency ) {
															$selected = '';
															if ( $l_currency == $currency ) {
																$selected = 'selected="selected"';
															}
															?>
                                                            <option <?php echo esc_attr( $selected ) ?>
                                                                    value="<?php echo esc_attr( $currency ) ?>"><?php echo esc_html( $currency ) . '-' . esc_html( get_woocommerce_currency_symbol( $currency ) ) ?></option>
															<?php
														}
														?>
                                                    </select>
                                                </td>
                                            </tr>
											<?php
										}
										?>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <th>
									<?php esc_html_e( 'Allow currency widget change currency', 'woocommerce-multi-currency' ) ?>
                                </th>
                                <td>
                                    <div class="vi-ui toggle checkbox">
                                        <input id="<?php echo esc_attr( self::set_field( 'allow_translatepress_and_widget_change_currency' ) ) ?>"
                                               type="checkbox" <?php checked( self::get_field( 'allow_translatepress_and_widget_change_currency' ), 1 ) ?>
                                               tabindex="0" class="hidden" value="1"
                                               name="<?php echo esc_attr( self::set_field( 'allow_translatepress_and_widget_change_currency' ) ) ?>"/>
                                        <label></label>
                                    </div>
                                </td>
                            </tr>

                        </table>
						<?php
					}
					if ( class_exists( 'Polylang' ) ) {
						?>
                        <h3>
							<?php esc_html_e( 'Polylang', 'woocommerce-multi-currency' ) ?>
                        </h3>
                        <table class="optiontable form-table">
                            <tr>
                                <th>
                                    <label>
										<?php esc_html_e( 'Language switcher', 'woocommerce-multi-currency' ) ?>
                                    </label>
                                </th>
                                <td>
                                    <table class="vi-ui table">
                                        <thead>
                                        <tr>
                                            <th class="four wide"><?php esc_html_e( 'Language', 'woocommerce-multi-currency' ) ?></th>
                                            <th><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        </tr>
                                        </thead>
                                        <tbody>
										<?php
										$languages = pll_languages_list();

										foreach ( $languages as $language ) {

											?>
                                            <tr>
                                                <td><?php echo esc_html( $language ) ?></td>
                                                <td>
                                                    <select name="<?php echo esc_attr( self::set_field( $language . '_by_language' ) ) ?>"
                                                            class="vi-ui"
                                                            data-placeholder="<?php esc_attr_e( 'Please select currency', 'woocommerce-multi-currency' ) ?>">
                                                        <option value="0"><?php echo esc_html__( 'Default', 'woocommerce-multi-currency' ) ?></option>
														<?php
														$l_currency = self::get_field( $language . '_by_language', array() );

														foreach ( $currencies as $currency ) {
															$selected = '';

															if ( $l_currency == $currency ) {
																$selected = 'selected="selected"';
															}

															?>
                                                            <option <?php echo esc_attr( $selected ) ?>
                                                                    value="<?php echo esc_attr( $currency ) ?>"><?php echo esc_html( $currency ) . '-' . esc_html( get_woocommerce_currency_symbol( $currency ) ) ?></option>
															<?php
														}
														?>
                                                    </select>

                                                </td>
                                            </tr>
											<?php
										}
										?>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <th>
                                    <label for="<?php echo esc_attr( self::set_field( 'add_query_arg_to_languague_switcher' ) ) ?>">
										<?php esc_html_e( 'Add query params', 'woocommerce-multi-currency' ) ?>
                                    </label>
                                </th>
                                <td>
                                    <div class="vi-ui toggle checkbox">
                                        <input id="<?php echo esc_attr( self::set_field( 'add_query_arg_to_languague_switcher' ) ) ?>"
                                               type="checkbox" <?php checked( self::get_field( 'add_query_arg_to_languague_switcher' ), 1 ) ?>
                                               tabindex="0" class="hidden" value="1"
                                               name="<?php echo esc_attr( self::set_field( 'add_query_arg_to_languague_switcher' ) ) ?>"/>
                                        <label></label>
                                    </div>
                                    <p class="description"><?php esc_html_e( 'Add query param to URL to switch currency based on language while using cache plugin that prevents currency from changing based on language', 'woocommerce-multi-currency' ) ?></p>
                                </td>
                            </tr>

                        </table>
						<?php
					}

					if ( is_plugin_active( 'sitepress-multilingual-cms/sitepress.php' ) ) {
						?>
                        <h3>
							<?php esc_html_e( 'WPML.org', 'woocommerce-multi-currency' ) ?>
                        </h3>
                        <table class="optiontable form-table">
                            <tr>
                                <th>
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </th>
                                <td>
                                    <div class="vi-ui toggle checkbox">
                                        <input id="<?php echo esc_attr( self::set_field( 'enable_wpml' ) ) ?>"
                                               type="checkbox" <?php checked( self::get_field( 'enable_wpml' ), 1 ) ?>
                                               tabindex="0" class="hidden" value="1"
                                               name="<?php echo esc_attr( self::set_field( 'enable_wpml' ) ) ?>"/>
                                        <label></label>
                                    </div>
                                    <p class="description"><?php esc_html_e( 'All product fields of WooCommerce Multi Currency will be copied. When you switch language, Currency will change. ', 'woocommerce-multi-currency' ) ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th>
                                    <label>
										<?php esc_html_e( 'Language switcher', 'woocommerce-multi-currency' ) ?>
                                    </label>
                                </th>
                                <td>
                                    <table class="vi-ui table">
                                        <thead>
                                        <tr>
                                            <th class="four wide"><?php esc_html_e( 'Language', 'woocommerce-multi-currency' ) ?></th>
                                            <th><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        </tr>
                                        </thead>
                                        <tbody>
										<?php
										$languages = $langs = apply_filters( 'wpml_active_languages', null, null );
										if ( count( $languages ) ) {
											foreach ( $languages as $key => $language ) {
												?>
                                                <tr>
                                                    <td><?php echo isset( $language['native_name'] ) ? esc_html( $language['native_name'] ) : esc_html( $key ) ?></td>
                                                    <td>
                                                        <select name="<?php echo esc_attr( self::set_field( $key . '_wpml_by_language' ) ) ?>"
                                                                class="vi-ui"
                                                                data-placeholder="<?php esc_attr_e( 'Please select currency', 'woocommerce-multi-currency' ) ?>">
                                                            <option value="0"><?php echo esc_html__( 'Default', 'woocommerce-multi-currency' ) ?></option>
															<?php
															$l_currency = self::get_field( $key . '_wpml_by_language', array() );
															foreach ( $currencies as $currency ) {
																$selected = '';
																if ( $l_currency == $currency ) {
																	$selected = 'selected="selected"';
																}
																?>
                                                                <option <?php echo esc_attr( $selected ) ?>
                                                                        value="<?php echo esc_attr( $currency ) ?>"><?php echo esc_html( $currency ) . '-' . esc_html( get_woocommerce_currency_symbol( $currency ) ) ?></option>
																<?php
															}
															?>
                                                        </select>
                                                    </td>
                                                </tr>
												<?php
											}
										}
										?>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </table>
						<?php
					}
					?>
                </div>
                <!-- Design !-->
                <div class="vi-ui bottom attached tab segment" data-tab="design">
                    <!-- Tab Content !-->
                    <h3><?php esc_html_e( 'Currencies Bar', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_design' ) ) ?>">
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_design' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_design' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_design' ) ) ?>"/>
                                    <label></label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'is_checkout' ) ) ?>">
									<?php esc_html_e( 'Checkout page', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'is_checkout' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'is_checkout' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'is_checkout' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Enable to hide Currencies Bar on Checkout page.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'is_cart' ) ) ?>">
									<?php esc_html_e( 'Cart page', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'is_cart' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'is_cart' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'is_cart' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Enable to hide Currencies Bar on Cart page.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'conditional_tags' ) ) ?>">
									<?php esc_html_e( 'Conditional Tags', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input placeholder="<?php esc_html_e( 'eg: !is_page(array(34,98,73))', 'woocommerce-multi-currency' ) ?>"
                                       type="text"
                                       value="<?php echo esc_attr( htmlentities( self::get_field( 'conditional_tags' ) ) ) ?>"
                                       name="<?php echo esc_attr( self::set_field( 'conditional_tags' ) ) ?>"/>

                                <p class="description">
									<?php esc_html_e( 'Adjust which pages will appear using WP\'s conditional tags.', 'woocommerce-multi-currency' ) ?>
                                    <br/>
                                    Ex: is_home(), is_shop(), is_product(), is_cart(), is_checkout(),...
                                    <a href="https://codex.wordpress.org/Conditional_Tags" target="_blank">
										<?php esc_html_e( 'more', 'woocommerce-multi-currency' ); ?>
                                    </a>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Title', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
								<?php
								self::default_language_flag_html( 'design_title' );
								?>
                                <input type="text" name="<?php echo esc_attr( self::set_field( 'design_title' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'design_title' ) ) ?>"/>
								<?php
								if ( count( self::$languages ) ) {
									foreach ( self::$languages as $key => $value ) {
										?>
                                        <p>
                                            <label for="<?php echo esc_attr( "design_title_{$value}" ) ?>"><?php
												if ( isset( self::$languages_data[ $value ]['country_flag_url'] ) && self::$languages_data[ $value ]['country_flag_url'] ) {
													?>
                                                    <img src="<?php echo esc_url( self::$languages_data[ $value ]['country_flag_url'] ); ?>">
													<?php
												}
												echo esc_html( $value );
												if ( isset( self::$languages_data[ $value ]['translated_name'] ) ) {
													echo '(' . esc_html( self::$languages_data[ $value ]['translated_name'] ) . ')';
												}
												?>:</label>
                                        </p>
                                        <input id="<?php echo esc_attr( "design_title_{$value}" ) ?>"
                                               type="text"
                                               name="<?php echo esc_attr( self::set_field( "design_title_{$value}" ) ) ?>"
                                               value="<?php echo esc_attr( self::$settings->get_params( 'design_title', $value ) ); ?>">
										<?php
									}
								}
								?>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'position' ) ) ?>">
									<?php esc_html_e( 'Position', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui form">
                                    <div class="fields">
                                        <div class="four wide field">
                                            <img src="<?php echo esc_url( WOOMULTI_CURRENCY_IMAGES ) . 'position_1.jpg' ?>"
                                                 class="vi-ui centered medium image middle aligned "/>

                                            <div class="vi-ui toggle checkbox center aligned segment">
                                                <input id="<?php echo esc_attr( self::set_field( 'design_position' ) ) ?>"
                                                       type="radio" <?php checked( self::get_field( 'design_position', 0 ), 0 ) ?>
                                                       tabindex="0" class="hidden" value="0"
                                                       name="<?php echo esc_attr( self::set_field( 'design_position' ) ) ?>"/>
                                                <label><?php esc_attr_e( 'Left', 'woocommerce-multi-currency' ) ?></label>
                                            </div>

                                        </div>
                                        <div class="two wide field">
                                        </div>

                                        <div class="four wide field">
                                            <img src="<?php echo esc_url( WOOMULTI_CURRENCY_IMAGES ) . 'position_2.jpg' ?>"
                                                 class="vi-ui centered medium image middle aligned "/>

                                            <div class="vi-ui toggle checkbox center aligned segment">
                                                <input id="<?php echo esc_attr( self::set_field( 'design_position' ) ) ?>"
                                                       type="radio" <?php checked( self::get_field( 'design_position' ), 1 ) ?>
                                                       tabindex="0" class="hidden" value="1"
                                                       name="<?php echo esc_attr( self::set_field( 'design_position' ) ) ?>"/>
                                                <label><?php esc_attr_e( 'Right', 'woocommerce-multi-currency' ) ?></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_collapse' ) ) ?>">
									<?php esc_html_e( 'Desktop', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_collapse' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_collapse' ), 1 ) ?>
                                           tabindex="0" class="wmc-collapse-desktop hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_collapse' ) ) ?>"/>
                                    <label><?php esc_html_e( 'Enable Collapse', 'woocommerce-multi-currency' ) ?></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Sidebar will collapse if you have many currencies.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr class="click-to-expand-currencies-bar">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies_bar' ) ) ?>">
									<?php esc_html_e( 'Click to expand currencies bar', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies_bar' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'click_to_expand_currencies_bar' ), 1 ) ?>
                                           value="1"
                                           name="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies_bar' ) ) ?>"/>
                                    <label></label>
                                </div>
                            </td>
                        </tr>
                        <tr class="click-to-expand-currencies-bar">
                            <th>
                                <label><?php esc_html_e( 'Expand button color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'expand_button_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'expand_button_color', '#ccc' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'expand_button_color', '#cccccc' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr class="click-to-expand-currencies-bar">
                            <th>
                                <label><?php esc_html_e( 'Expand button background', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'expand_button_background' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'expand_button_background', '#999999' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'expand_button_background', '#999999' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr class="click-to-expand-currencies-bar">
                            <th>
                                <label><?php esc_html_e( 'Expand button opacity', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="number" min="0" max="1" step="0.1"
                                       name="<?php echo esc_attr( self::set_field( 'expand_button_opacity' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'expand_button_opacity', '' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'disable_collapse' ) ) ?>">
									<?php esc_html_e( 'Mobile', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'disable_collapse' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'disable_collapse' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'disable_collapse' ) ) ?>"/>
                                    <label><?php esc_html_e( 'Disable Collapse', 'woocommerce-multi-currency' ) ?></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Enable this option to expand the currencies bar.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Top position', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text"
                                       name="<?php echo esc_attr( self::set_field( 'sidebar_position' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'sidebar_position', '50%' ) ) ?>"
                                       placeholder="<?php esc_html_e( 'eg: 50% or 500px', 'woocommerce-multi-currency' ); ?>"/>
                                <p class="description"><?php esc_html_e( 'Distance from the sidebar center to the screen top corner. Use % to use proportional screen size or px to use pixels.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Max height (px)', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" name="<?php echo esc_attr( self::set_field( 'max_height' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'max_height', '' ) ) ?>"
                                       placeholder="<?php esc_html_e( 'eg: 500', 'woocommerce-multi-currency' ); ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Text color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'text_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'text_color', '#fff' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'text_color', '#fff' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Sidebar layout', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'sidebar_layout' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( self::get_field( 'sidebar_layout' ), 'split' ) ?>
                                            value="split"><?php esc_html_e( 'Split currency line with space', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_layout' ), 'full' ) ?>
                                            value="full"><?php esc_html_e( 'Curved border and no split space', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_layout' ), 'single' ) ?>
                                            value="single"><?php esc_html_e( 'Single slide select', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_layout' ), 'hover_detail' ) ?>
                                            value="hover_detail"><?php esc_html_e( 'Hover show detail', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description wmc-des-single-slide"><?php esc_html_e( 'Layout option Single slide select not display flag, not work with Max height option and may not display correctly if multiple currencies are in the list.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description wmc-des-hover-detail"><?php esc_html_e( 'Layout option Hover show detail not display flag and may not display correctly if multiple currencies are in the list.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Style', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'sidebar_style' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( self::get_field( 'sidebar_style' ), 0 ) ?>
                                            value="0"><?php esc_html_e( 'Default', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_style' ), 1 ) ?>
                                            value="1"><?php esc_html_e( 'Symbol', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_style' ), 2 ) ?>
                                            value="2"><?php esc_html_e( 'Flag', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_style' ), 3 ) ?>
                                            value="3"><?php esc_html_e( 'Flag + Currency code', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'sidebar_style' ), 4 ) ?>
                                            value="4"><?php esc_html_e( 'Flag + Currency symbol', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Main color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'main_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'main_color', '#f78080' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'main_color', '#f78080' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr class="wmc-name-background-color">
                            <th>
                                <label><?php esc_html_e( 'Currency name background', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'name_background_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'name_background_color', '#8d4747' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'name_background_color', '#8d4747' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Hover color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'hover_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'hover_color', '#f78080' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'hover_color', '#f78080' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Background color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'background_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'background_color', '#212121' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'background_color', '#212121' ) ) ?>"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3><?php esc_html_e( 'Currency selector', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_switcher' ) ) ?>">
									<?php esc_html_e( 'Currency Price Switcher', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $price_switcher = self::get_field( 'price_switcher', 0 ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_switcher' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $price_switcher, 0 ) ?>
                                            value="0"><?php esc_html_e( 'Not Show', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 1 ) ?>
                                            value="1"><?php esc_html_e( 'Flag', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 2 ) ?>
                                            value="2"><?php esc_html_e( 'Flag + Currency Code', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 3 ) ?>
                                            value="3"><?php esc_html_e( 'Flag + Price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 4 ) ?>
                                            value="4"><?php esc_html_e( 'Currency Symbol', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 5 ) ?>
                                            value="5"><?php esc_html_e( 'Currency Code + Name', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher under product price in single product pages.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_switcher_layout' ) ) ?>">
									<?php esc_html_e( 'Switcher layout', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $price_switcher = self::get_field( 'price_switcher_layout', 0 ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_switcher_layout' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $price_switcher, 'split' ) ?>
                                            value="split"><?php esc_html_e( 'Split currency line with space', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher, 'full' ) ?>
                                            value="full"><?php esc_html_e( 'Curved border and no split space', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_switcher_position' ) ) ?>">
									<?php esc_html_e( 'Switcher Position', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $price_switcher_position = self::get_field( 'price_switcher_position', 20 ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_switcher_position' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $price_switcher_position, 5 ) ?>
                                            value="5"><?php esc_html_e( 'Below title', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 10 ) ?>
                                            value="10"><?php esc_html_e( 'Below price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 20 ) ?>
                                            value="20"><?php esc_html_e( 'Below excerpt', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 30 ) ?>
                                            value="30"><?php esc_html_e( 'Below add to cart', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 40 ) ?>
                                            value="40"><?php esc_html_e( 'Below meta', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 50 ) ?>
                                            value="50"><?php esc_html_e( 'Below sharing', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'Position of currency switcher in single product pages, it may be affected by the theme or product template', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies' ) ) ?>">
									<?php esc_html_e( 'Click to expand currency selector', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'click_to_expand_currencies' ), 1 ) ?>
                                           value="1"
                                           name="<?php echo esc_attr( self::set_field( 'click_to_expand_currencies' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'By default, dropdown currency selector including product price switcher, Currency selector widgets(except the Default layout) and Currency selector shortcodes(except [woo_multi_currency]) will expand on hovering. Enable this option if you want them to only expand when clicking on.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3><?php esc_html_e( 'Currency price collate', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_collate' ) ) ?>">
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'price_collate' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'price_collate' ), 1 ) ?>
                                           value="1"
                                           name="<?php echo esc_attr( self::set_field( 'price_collate' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Display a product price collated with other currency. This feature not working with fixed price feature and maybe not working with cache system.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_collate_layout' ) ) ?>">
									<?php esc_html_e( 'Price collate layout', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $collate_layout = self::get_field( 'price_collate_layout', 'inline' ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_collate_layout' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $collate_layout, 'inline' ) ?>
                                            value="inline"><?php esc_html_e( 'Inline', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $collate_layout, 'split' ) ?>
                                            value="split"><?php esc_html_e( 'Split line', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $collate_layout, 'tooltip' ) ?>
                                            value="tooltip"><?php esc_html_e( 'Tooltip', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr class="wmc-price-collate-title">
                            <th>
                                <label><?php esc_html_e( 'Title', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class=""
                                       name="<?php echo esc_attr( self::set_field( 'price_collate_title' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'price_collate_title', '' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_collate_single' ) ) ?>">
									<?php esc_html_e( 'Single product position', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $price_switcher_position = self::get_field( 'price_collate_single', 20 ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_collate_single' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $price_switcher_position, 5 ) ?>
                                            value="5"><?php esc_html_e( 'After title', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 10 ) ?>
                                            value="10"><?php esc_html_e( 'After price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 20 ) ?>
                                            value="20"><?php esc_html_e( 'After excerpt', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 30 ) ?>
                                            value="30"><?php esc_html_e( 'After add to cart', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 40 ) ?>
                                            value="40"><?php esc_html_e( 'After meta', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 50 ) ?>
                                            value="50"><?php esc_html_e( 'After sharing', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'Position of currency switcher in single product pages, it may be affected by the theme or product template', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_collate_archive' ) ) ?>">
									<?php esc_html_e( 'Archive position', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
								<?php $price_switcher_position = self::get_field( 'price_collate_archive', 'after_price' ) ?>
                                <select name="<?php echo esc_attr( self::set_field( 'price_collate_archive' ) ) ?>"
                                        class="vi-ui dropdown fluid">
                                    <option <?php selected( $price_switcher_position, 'after_title' ) ?>
                                            value="after_title"><?php esc_html_e( 'After title', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 'before_sale_flash' ) ?>
                                            value="before_sale_flash"><?php esc_html_e( 'Before sale flash', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 'after_sale_flash' ) ?>
                                            value="after_sale_flash"><?php esc_html_e( 'After sale flash', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 'before_price' ) ?>
                                            value="before_price"><?php esc_html_e( 'Before price', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $price_switcher_position, 'after_price' ) ?>
                                            value="after_price"><?php esc_html_e( 'After price', 'woocommerce-multi-currency' ) ?></option>
                                </select>
                                <p class="description"><?php esc_html_e( 'Position of currency switcher in archive pages, it may be affected by the theme template', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3><?php esc_html_e( 'Widget', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Flag Custom', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <textarea placeholder="Example:&#x0a;EUR,ES&#x0a;USD,VN"
                                          name="<?php echo esc_attr( self::set_field( 'flag_custom' ) ) ?>"><?php echo esc_attr( self::get_field( 'flag_custom', '' ) ) ?></textarea>
                                <p class="description"><?php esc_html_e( 'Some countries use the same currency. You can choose the flag correctly. Each line is a flag. Structure [currency_code,country_code]. Example: EUR,ES', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3><?php esc_html_e( 'Shortcode', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Text color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'shortcode_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'shortcode_color', '#212121' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'shortcode_color', '#474747' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Background color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'shortcode_bg_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'shortcode_bg_color', '#fff' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'shortcode_bg_color', '#fff' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Active currency text color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'shortcode_active_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'shortcode_active_color', '#212121' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'shortcode_active_color', '#212121' ) ) ?>"/>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Active currency background color', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="text" class="color-picker"
                                       name="<?php echo esc_attr( self::set_field( 'shortcode_active_bg_color' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'shortcode_active_bg_color', '#fff' ) ) ?>"
                                       style="background-color: <?php echo esc_attr( self::get_field( 'shortcode_active_bg_color', '#fff' ) ) ?>"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3><?php esc_html_e( 'Custom', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'CSS', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <textarea placeholder=".woocommerce-multi-currency{}"
                                          name="<?php echo esc_attr( self::set_field( 'custom_css' ) ) ?>"><?php echo esc_attr( self::get_field( 'custom_css', '' ) ) ?></textarea>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <!-- Codex !-->
                <div class="vi-ui bottom attached tab segment" data-tab="codex">
                    <h3><?php esc_html_e( 'Shortcodes', 'woocommerce-multi-currency' ) ?></h3>
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with default style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_plain_horizontal]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with plain horizontal style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_plain_vertical]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with plain vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_plain_vertical_2]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with plain vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout3]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with flag horizontal style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout4]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with flag vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout5]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with flag and currency code vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout6]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with currency symbol horizontal style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout7]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with currency symbol vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout8]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with circle block of currency symbol vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout9]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with curved hiding block of currency horizontal style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout10]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with flag, currency name, currency symbol vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_layout11]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a currency switcher widgets with flag, currency name, currency code vertical style.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_product_price_switcher]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Display a product price price switcher.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Note: This is applied for specific product pages built with Elementor or other page builders.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_rates]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'This shortcode will display the exchange rate between parameter currency and your default currency on the front-end. You can change to other currencies by changing the currencies codes "currencies" parameter (eg: currencies="GBP,EUR")', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_exchange]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'To display product price in a particular currency. On a single product page, you no need additional parameter. Other than on a single product page, you need to add some parameter: product_id="" currency="" price="" original_price="" with details:', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Product ID: add the ID of the product you want to convert currency.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Currency: Add the currency you want to convert the product price, leave blank and the price will be converted the currency that is currently applied to customers.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Price: Product price.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( 'Original price: Add this value if the item is on sale.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_convertor]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'To display a currency converter to convert specific value among currencies.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_product_collate]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'This shortcode display a product price collated with other currency. Shortcode parameter:', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( '"layout": layout of shortcode ("inline" or "split")', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( '"price_convert": price number in default currency to display', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php esc_html_e( '"price_range": min price and max price in default currency to display (eg: 100|200)', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label>
									<?php echo esc_html( '[woo_multi_currency_single_product_collate]' ) ?>
                                </label>
                            </th>
                            <td>
                                <p class="description"><?php esc_html_e( 'Product price collate with no parameter, use for Elementor single product template', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <!-- Beauty Price !-->
                <div class="vi-ui bottom attached tab segment" data-tab="price">
					<?php
					$input_price           = wc_prices_include_tax();
					$shop_display_incl_tax = 'incl' === get_option( 'woocommerce_tax_display_shop' ) ? true : false;
					$cart_display_incl_tax = 'incl' === get_option( 'woocommerce_tax_display_cart' ) ? true : false;
					$cond_1                = $input_price && $shop_display_incl_tax && $cart_display_incl_tax;
					$cond_2                = ! $input_price && ! $shop_display_incl_tax && ! $cart_display_incl_tax;
					if ( ! $cond_1 && ! $cond_2 && wc_tax_enabled() ) {
						?>
                        <div class="vi-ui negative small message"><?php echo sprintf( '%1$s <a href="admin.php?page=wc-settings&tab=tax" target="_blank">%2$s</a> %3$s', esc_html__( 'This feature does not work with your current tax config, please change', 'woocommerce-multi-currency' ), esc_html__( 'tax settings', 'woocommerce-multi-currency' ), esc_html__( 'so that input price and output price have the same tax config: "include tax" or "exclude tax".', 'woocommerce-multi-currency' ) ) ?></div>
						<?php
					}
					?>
                    <table class="form-table">
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'beauty_price_enable' ) ) ?>">
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'beauty_price_enable' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'beauty_price_enable' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'beauty_price_enable' ) ) ?>"/>
                                </div>
                                <p class="description"><?php esc_html_e( 'Enable this option to apply below rules to prices of your products in frontend', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
						<?php
						/*
						?>
						<tr>
							<th>
								<label for="<?php echo esc_attr( self::set_field( 'beauty_price_shipping' ) ) ?>">
									<?php esc_html_e( 'Apply to shipping cost', 'woocommerce-multi-currency' ) ?>
								</label>
							</th>
							<td>
								<div class="vi-ui toggle checkbox">
									<input id="<?php echo esc_attr( self::set_field( 'beauty_price_shipping' ) ) ?>"
										   type="checkbox" <?php checked( self::get_field( 'beauty_price_shipping' ), 1 ) ?>
										   tabindex="0" class="hidden" value="1"
										   name="<?php echo esc_attr( self::set_field( 'beauty_price_shipping' ) ) ?>"/>
								</div>
								<p class="description"><?php esc_html_e( 'Also apply price format to shipping cost. Your rules may affect too much to shipping cost and taxes so please use this option with consideration.', 'woocommerce-multi-currency' ) ?></p>
								<p class="description"><?php _e( '<strong>Important: </strong>If you use a shipping plugin, please check shipping cost in all currencies carefully when enabling this option. Turn it off immediately if you see any errors.', 'woocommerce-multi-currency' ) ?></p>
							</td>
						</tr>
						<?php
						*/
						?>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'price_lower_bound' ) ) ?>">
									<?php esc_html_e( 'Accept lower bound', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'price_lower_bound' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'price_lower_bound' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'price_lower_bound' ) ) ?>"/>
                                </div>
                            </td>
                        </tr>
						<?php
						do_action( 'wmc_admin_settings_after_price_lower_bound' );
						?>
                    </table>

                    <table class="vi-ui table wmc-price-rules">
                        <thead>
                        <tr>
                            <th class="wmc-column-width"><?php esc_html_e( 'From', 'woocommerce-multi-currency' ) ?></th>
                            <th class="wmc-column-width"><?php esc_html_e( 'To', 'woocommerce-multi-currency' ) ?></th>
                            <th class="wmc-column-width"
                                data-tooltip="<?php esc_html_e( 'If you format integer part, value is required', 'woocommerce-multi-currency' ); ?>">
								<?php esc_html_e( 'Value', 'woocommerce-multi-currency' ) ?>
                                <i class="icon question circle outline"></i>
                            </th>
                            <th class="wmc-column-width"><?php esc_html_e( 'Part', 'woocommerce-multi-currency' ) ?></th>
                            <th class="wmc-column-width"
                                data-tooltip="<?php esc_html_e( 'When enabled, if part is fraction, plus 1 to final price; if part is integer, plus "10 to the power length_of_compared_part" to final price', 'woocommerce-multi-currency' ); ?>"><?php esc_html_e( 'Up 1 unit', 'woocommerce-multi-currency' ) ?>
                                <i class="icon question circle outline"></i></th>
                            <th><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                            <th class="collapsing"><?php esc_html_e( 'Action', 'woocommerce-multi-currency' ) ?></th>
                        </tr>
                        </thead>
                        <tbody class="wmc-price-rule-rows">
                        <tr class="hidden">
                            <td colspan="6" class="hidden"></td>
                        </tr>
						<?php
						$beauty_price_from       = self::get_field( 'beauty_price_from', array() );
						$beauty_price_to         = self::get_field( 'beauty_price_to', array() );
						$beauty_price_value      = self::get_field( 'beauty_price_value', array() );
						$beauty_price_round_up   = self::get_field( 'beauty_price_round_up', array() );
						$beauty_price_currencies = self::get_field( 'beauty_price_currencies', array() );
						$beauty_price_part       = self::get_field( 'beauty_price_part', array() );

						$count_from       = is_array( $beauty_price_from ) ? count( $beauty_price_from ) : '';
						$count_to         = is_array( $beauty_price_to ) ? count( $beauty_price_to ) : '';
						$count_value      = is_array( $beauty_price_value ) ? count( $beauty_price_value ) : '';
						$count_currencies = is_array( $beauty_price_currencies ) ? count( $beauty_price_currencies ) : '';
						$count_part       = is_array( $beauty_price_part ) ? count( $beauty_price_part ) : '';

						$selected_currencies = self::get_field( 'currency' );

						if ( $count_from && $count_to && $count_value && $count_currencies && $count_part ) {
							$count = min( $count_from, $count_to, $count_value, $count_currencies, $count_part );
							for ( $i = 0; $i < $count; $i ++ ) {
								?>
                                <tr data-index="<?php echo esc_attr( $i ) ?>">
                                    <td>
                                        <input type="text" required class="wmc-beauty-from"
                                               name="<?php echo esc_attr( self::set_field( 'beauty_price_from', 1 ) ) ?>"
                                               value="<?php echo esc_attr( $beauty_price_from[ $i ] ) ?>">
                                    </td>
                                    <td>
                                        <input type="text" required class="wmc-beauty-to"
                                               name="<?php echo esc_attr( self::set_field( 'beauty_price_to', 1 ) ) ?>"
                                               value="<?php echo esc_attr( $beauty_price_to[ $i ] ) ?>">
                                    </td>
                                    <td>
                                        <input type="text"
                                               name="<?php echo esc_attr( self::set_field( 'beauty_price_value', 1 ) ) ?>"
                                               value="<?php echo esc_attr( $beauty_price_value[ $i ] ) ?>"
                                               class="wmc-beauty-value">
                                    </td>
                                    <td>
                                        <select name="<?php echo esc_attr( self::set_field( 'beauty_price_part', 1 ) ) ?>"
                                                class="wmc-beauty-part">
                                            <option value="integer" <?php selected( $beauty_price_part[ $i ], 'integer' ) ?>><?php esc_html_e( 'Integer', 'woocommerce-multi-currency' ); ?></option>
                                            <option value="fraction" <?php selected( $beauty_price_part[ $i ], 'fraction' ) ?>><?php esc_html_e( 'Fraction', 'woocommerce-multi-currency' ); ?></option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="hidden"
                                               name="<?php echo esc_attr( self::set_field( 'beauty_price_round_up', 1 ) ) ?>"
                                               value="<?php echo esc_attr( isset( $beauty_price_round_up[ $i ] ) ? $beauty_price_round_up[ $i ] : '' ) ?>"
                                               class="wmc-beauty-round-up">
                                        <input type="checkbox"
                                               class="wmc-beauty-round-up-check" <?php if ( ! empty( $beauty_price_round_up[ $i ] ) ) {
											echo esc_attr( 'checked' );
										} ?>>
                                    </td>
                                    <td>
                                        <input type="hidden"
                                               name="woo_multi_currency_params[beauty_price_currencies][<?php echo esc_attr( $i ) ?>][]">
                                        <select name="woo_multi_currency_params[beauty_price_currencies][<?php echo esc_attr( $i ) ?>][]"
                                                class="wmc-select-2"
                                                multiple>
											<?php
											foreach ( $selected_currencies as $currency ) {
												$selected = isset( $beauty_price_currencies[ $i ] ) && is_array( $beauty_price_currencies[ $i ] ) && in_array( $currency, $beauty_price_currencies[ $i ] ) ? 'selected' : '';
												echo "<option value='" . esc_attr( $currency ) . "' " . esc_attr( $selected ) . ">" . esc_html( $currency ) . "</option>";
											}
											?>
                                        </select>
                                    </td>
                                    <td>
                                        <div class="vi-ui small icon red button wmc-remove-price-rule"><i
                                                    class="trash icon"></i></div>
                                    </td>
                                </tr>
								<?php
							}
						}
						?>
                        </tbody>

                        <tfoot class="full-width">
                        <tr>
                            <th colspan="9">
                                <div style="display: flex">
                                     <span class="vi-ui green labeled icon button wmc-add-price-rule">
                                            <i class="plus icon"></i> <?php esc_html_e( 'Add rule', 'woocommerce-multi-currency' ) ?>
                                        </span>
                                    <p class="vi-ui yellow wmc-beauty-price-message"></p>
                                </div>
                            </th>
                        </tr>
                        </tfoot>
                    </table>
                    <div class="vi-ui styled fluid accordion">
                        <div class="title">
                            <i class="dropdown icon"></i>
							<?php esc_html_e( 'How does it work?', 'woocommerce-multi-currency' ); ?>
                        </div>
                        <div class="content">
                            <img src="<?php echo esc_url( WOOMULTI_CURRENCY_IMAGES ) . 'beauty-price-example.png'; ?>"/>
                        </div>
                    </div>
                </div>

                <!-- Checkout !-->
                <div class="vi-ui bottom attached tab segment" data-tab="checkout">
                    <!-- Tab Content !-->
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_multi_payment' ) ) ?>">
									<?php esc_html_e( 'Enable', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_multi_payment' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_multi_payment' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_multi_payment' ) ) ?>"/>
                                </div>
                                <p class="description"><?php esc_html_e( 'Manage checkout currencies. If disabled, only the default currency will be used for checkout.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo sprintf( '<strong>%1$s</strong>: %2$s', esc_html__( 'Note', 'woocommerce-multi-currency' ), esc_html__( 'You have to enable this option to use below features(except for Display multi currencies).', 'woocommerce-multi-currency' ) ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_cart_page' ) ) ?>">
									<?php esc_html_e( 'Enable Cart Page', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_cart_page' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_cart_page' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_cart_page' ) ) ?>"/>
                                </div>
                                <p class="description">
									<?php esc_html_e( 'Change the currency in cart page to a check out currency.', 'woocommerce-multi-currency' ) ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'checkout_currency' ) ) ?>">
									<?php esc_html_e( 'Checkout currency', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>

                            <td>
                                <table class="vi-ui table">
                                    <thead>
                                    <tr>
                                        <th class="two wide"><?php esc_html_e( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="two wide"><?php esc_html_e( 'Default', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="four wide"><?php esc_html_e( 'Checkout Currency', 'woocommerce-multi-currency' ) ?></th>
                                        <th class="ten wide"><?php esc_html_e( 'Payment methods', 'woocommerce-multi-currency' ) ?></th>
                                    </tr>
                                    </thead>
                                    <tbody>
									<?php

									$currencies             = self::get_field( 'currency', array( get_option( 'woocommerce_currency' ) ) );
									$checkout_currency      = self::get_field( 'checkout_currency', get_option( 'woocommerce_currency' ) );
									$checkout_currency_args = self::get_field( 'checkout_currency_args', array( get_option( 'woocommerce_currency' ) ) );
									$payment_gateways       = WC()->payment_gateways->payment_gateways();

									if ( is_array( $currencies ) ) {
										if ( count( array_filter( $currencies ) ) < 1 ) {
											$currencies = array();
										}
									} else {
										$currencies = array();
									}
									/*Convert*/
									if ( count( $currencies ) ) {
										//$payment_gateways = WC()->payment_gateways()->get_available_payment_gateways();

										$bacs_account_details = get_option( 'woocommerce_bacs_accounts' );

										foreach ( $currencies as $key => $currency ) {
											if ( in_array( $currency, $checkout_currency_args ) || ! $checkout_currency ) {
												$selected_checkout_currency = 1;
											} else {
												$selected_checkout_currency = 0;
											}

											if ( self::get_field( 'checkout_currency' ) == $currency ) {
												$disabled_currency = 1;
											} else {
												$disabled_currency = 0;
											}

											?>
                                            <tr>
                                                <td class="collapsing">
													<?php echo esc_html( $currency ) ?>
                                                </td>
                                                <td class="collapsing">
                                                    <div class="vi-ui toggle checkbox">
                                                        <input id="<?php echo esc_attr( self::set_field( 'checkout_currency' ) ) ?>"
                                                               type="radio" <?php checked( $checkout_currency, $currency ) ?>
                                                               tabindex="0" class="hidden"
                                                               value="<?php echo esc_attr( $currency ) ?>"
                                                               name="<?php echo esc_attr( self::set_field( 'checkout_currency' ) ) ?>"/>
                                                    </div>
                                                </td>
                                                <td class="collapsing">
                                                    <select class="vi-ui dropdown fluid wmc-checkout-currency-status"
                                                            name="<?php echo esc_attr( self::set_field( 'checkout_currency_args', 1 ) ) ?>" <?php echo $disabled_currency ? 'disabled="disabled"' : '' ?>>
                                                        <option value="0" <?php selected( $selected_checkout_currency, 0 ) ?>><?php esc_html_e( 'No', 'woocommerce-multi-currency' ) ?></option>
                                                        <option value="<?php echo esc_attr( $currency ) ?>" <?php selected( $selected_checkout_currency, 1 ) ?>><?php esc_html_e( 'Yes', 'woocommerce-multi-currency' ) ?></option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <select name="<?php echo esc_attr( self::set_field( 'currency_payment_method_' . $currency, 1 ) ) ?>"
                                                            class="vi-ui select2" multiple="multiple">
														<?php
														if ( $payment_gateways ) {
															$payments = self::get_field( 'currency_payment_method_' . $currency, array() );
															foreach ( $payment_gateways as $pm_slug => $payment_method ) {
																$payment_enabled1 = false;
																$payment_enabled2 = false;

																if ( isset( $payment_method->settings['enabled'] ) ) {
																	if ( $payment_method->settings['enabled'] && $payment_method->settings['enabled'] !== 'no' ) {
																		$payment_enabled1 = true;
																	}
																}

																if ( $payment_method->enabled && $payment_method->enabled !== 'no' ) {
																	$payment_enabled2 = true;
																}

																$payment_enabled = $payment_enabled1 || $payment_enabled2;

																if ( $payment_enabled ) {
																	$title_show = ! empty( $payment_method->method_title ) ? $payment_method->method_title : $payment_method->title;
																	$title_show = empty( $title_show ) ? $payment_method->id : $title_show;
																	?>
                                                                    <option <?php if ( in_array( $payment_method->id, $payments ) ) {
																		echo 'selected';
																	} ?> value="<?php echo esc_attr( $payment_method->id ) ?>"><?php echo esc_html( $title_show ) ?></option>
																<?php }
															}
														}
														?>
                                                    </select>

													<?php
													if ( ! empty( $bacs_account_details ) ) {
														?>
                                                        <p></p>
                                                        <select name="<?php echo esc_attr( self::set_field( 'bacs_account_' . $currency ) ) ?>">
                                                            <option value=""><?php esc_html_e( 'Show all', 'woocommerce-multi-currency' ) ?></option>
															<?php
															foreach ( $bacs_account_details as $account_detail ) {
																if ( empty( $account_detail['account_number'] ) ) {
																	continue;
																}
																$bacs_account = self::get_field( 'bacs_account_' . $currency );

																printf( '<option value="%s" %s>%s</option>',
																	esc_attr( $account_detail['account_number'] ),
																	selected( $bacs_account, $account_detail['account_number'] ),
																	esc_html( "{$account_detail['account_name']} ({$account_detail['account_number']})" ) );
															}
															?>
                                                        </select>
                                                        <p class="description">
                                                            <i>
																<?php esc_html_e( 'Direct bank transfer account will be display at thankyou page & email instructions if Bacs gateway availabel', 'woocommerce-multi-currency' ) ?>
                                                            </i>
                                                        </p>
														<?php
													}
													?>

                                                </td>
                                            </tr>
										<?php }
									} ?>

                                    </tbody>
                                    <tfoot class="full-width">
                                    <tr>
                                        <th colspan="2"></th>
                                        <th colspan="2">
											<?php esc_html_e( 'Change all checkout status to:', 'woocommerce-multi-currency' ); ?>
                                            <button class="vi-ui green mini button wmc-status-to-yes"
                                                    type="button"><?php esc_html_e( 'Yes', 'woocommerce-multi-currency' ); ?></button>
                                            <button class="vi-ui red mini button wmc-status-to-no"
                                                    type="button"><?php esc_html_e( 'No', 'woocommerce-multi-currency' ); ?></button>
                                        </th>
                                    </tr>
                                    </tfoot>
                                </table>
                                <div class="vi-ui message yellow">
                                    <ul class="list">
                                        <li><?php esc_html_e( 'All enabled payment methods are available to select here for all currencies but they will be validated again in checkout. Therefore, even if you select a payment method for a currency that the payment does not support, it will not be available in the frontend.', 'woocommerce-multi-currency' ) ?></li>
                                        <li><?php esc_html_e( 'E.g: PayPal does not support VND, if you select PayPal as a payment method of VND, PayPal will still not be available when your customers checkout in VND', 'woocommerce-multi-currency' ) ?></li>
                                    </ul>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'currency_by_payment_method' ) ) ?>">
									<?php esc_html_e( 'Currency by Payment method', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>

                            <td>
                                <table class="vi-ui table">
                                    <thead>
                                    <tr>
                                        <th class=""><?php esc_html_e( 'Payment method', 'woocommerce-multi-currency' ) ?></th>
                                        <th class=""><?php esc_html_e( 'Checkout Currency', 'woocommerce-multi-currency' ) ?></th>
                                    </tr>
                                    </thead>
                                    <tbody>
									<?php
									if ( is_array( $payment_gateways ) && count( $payment_gateways ) ) {
										if ( count( $currencies ) ) {
											foreach ( $payment_gateways as $payment_method ) {
												$payment_enabled1 = false;
												$payment_enabled2 = false;

												if ( isset( $payment_method->settings['enabled'] ) ) {
													if ( $payment_method->settings['enabled'] && $payment_method->settings['enabled'] !== 'no' ) {
														$payment_enabled1 = true;
													}
												}

												if ( $payment_method->enabled && $payment_method->enabled !== 'no' ) {
													$payment_enabled2 = true;
												}

												$payment_enabled = $payment_enabled1 || $payment_enabled2;

												if ( $payment_enabled ) {
													$selected_currency = self::get_field( 'currency_by_payment_method_' . $payment_method->id );
													?>
                                                    <tr>
                                                        <td><?php echo ! empty( $payment_method->method_title ) ? esc_html( $payment_method->method_title ) : esc_html( $payment_method->title ); ?></td>
                                                        <td>
                                                            <select name="<?php echo esc_attr( self::set_field( 'currency_by_payment_method_' . $payment_method->id ) ) ?>"
                                                                    class="vi-ui dropdown fluid vi-wmc-checkout-by-payment-method">
                                                                <option value=""><?php esc_html_e( 'Not set', 'woocommerce-multi-currency' ) ?></option>
																<?php
																foreach ( $currencies as $currency ) {
																	?>
                                                                    <option value="<?php echo esc_attr( $currency ) ?>" <?php selected( $selected_currency, $currency ) ?>><?php echo esc_html( $currency ) ?></option>
																	<?php
																}
																?>
                                                            </select>
															<?php
															if ( 'ppcp-gateway' === $payment_method->id ) {
																?>
                                                                <p><?php esc_html_e( 'For PayPal payment method of WooCommerce PayPal Payments plugin, if checkout currency is set, currency will be switched to this one when customers go to checkout', 'woocommerce-multi-currency' ) ?></p>
																<?php
															}
															?>
                                                        </td>
                                                    </tr>
													<?php
												}
											}
										}
									}
									?>
                                    </tbody>
                                </table>
                                <p class="description">
									<?php esc_html_e( 'Use this option if you want to put a mandatory currency with the respective payment gateway after clicking on the "Place orders"', 'woocommerce-multi-currency' ) ?>
									<?php
									if ( $has_block_page ) {
										esc_html_e( 'When use WC cart/checkout block, change currency by payment method may be not work', 'woocommerce-multi-currency' );
									}
									?>
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'currency_by_payment_method_immediate' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'currency_by_payment_method_immediate' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'currency_by_payment_method_immediate' ) ) ?>"/>
                                    <label class="description">
										<?php
										esc_html_e( "Enable this option to change the currency immediately at the checkout order detail when the customer selects a payment gateway, instead of after clicking the 'place order' button.", 'woocommerce-multi-currency' )
										?>
                                    </label>
                                </div>

                            </td>
                        </tr>

                        <tr class="wmc-currency-by-payment-row">
                            <th>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'currency_by_payment_method_without_reload_page' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'currency_by_payment_method_without_reload_page' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'currency_by_payment_method_without_reload_page' ) ) ?>"/>
                                    <label class="description">
										<?php esc_html_e( "Without reload checkout page", 'woocommerce-multi-currency' ) ?>
                                    </label>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Change currency follow', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <select name="<?php echo esc_attr( self::set_field( 'billing_shipping_currency' ) ) ?>"
                                        class="vi-ui dropdown fluid">
									<?php
									$options   = array(
										esc_html__( 'None', 'woocommerce-multi-currency' ),
										esc_html__( 'Billing address', 'woocommerce-multi-currency' ),
										esc_html__( 'Shipping address', 'woocommerce-multi-currency' )
									);
									$selectedd = self::get_field( 'billing_shipping_currency', 0 );
									foreach ( $options as $key => $option ) {
										$selected = $selectedd == $key ? 'selected' : '';
										echo sprintf( "<option value='%1d' %2s>%3s</option>", esc_attr( $key ), esc_attr( $selected ), esc_html( $option ) );
									} ?>
                                </select>

                                <p class="description"><?php echo esc_html__( 'Change currency when customer change billing or shipping address.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo esc_html__( 'This option cannot be used alongside Currency by Payment Method.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo esc_html__( 'When using along side the currency switcher at checkout page, this option may not work properly.', 'woocommerce-multi-currency' ) ?></p>
								<?php
								if ( $has_block_page ) { ?>
                                    <p class="description"><?php esc_html_e( 'When use WC cart/checkout block, this option may be not work', 'woocommerce-multi-currency' ) ?></p>
								<?php }
								?>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'only_shipping_country' ) ) ?>">
									<?php esc_html_e( 'Only get shipping address', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'only_shipping_country' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'only_shipping_country' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'only_shipping_country' ) ) ?>"/>
                                </div>
                                <p class="description">
									<?php esc_html_e( 'Only change currency when customer changes shipping country field (if disabled, when customer is not set "shipping to a different address", get shipping country by billing country)', 'woocommerce-multi-currency' ) ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'sync_checkout_currency' ) ) ?>">
									<?php esc_html_e( 'Sync checkout currency', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'sync_checkout_currency' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'sync_checkout_currency' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'sync_checkout_currency' ) ) ?>"/>
                                </div>
                                <p class="description">
									<?php esc_html_e( 'When currency is switched on cart/checkout page by the "Change currency follow" option above, also switch currency of the whole current customer session', 'woocommerce-multi-currency' ) ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'equivalent_currency' ) ) ?>">
									<?php esc_html_e( 'Display multi currencies', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'equivalent_currency' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'equivalent_currency' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'equivalent_currency' ) ) ?>"/>
                                </div>
                                <select name="<?php echo esc_attr( self::set_field( 'equivalent_currency_page' ) ) ?>"
                                        class="vi-ui dropdown fluid">
									<?php
									$display_multi_currencies_pages = [
										'checkout'        => esc_html__( 'Checkout page', 'woocommerce-multi-currency' ),
										'cart'            => esc_html__( 'Cart page', 'woocommerce-multi-currency' ),
										'cart_n_checkout' => esc_html__( 'Both of cart & checkout page', 'woocommerce-multi-currency' ),
									];

									$equivalent_currency_page = self::get_field( 'equivalent_currency_page' );

									foreach ( $display_multi_currencies_pages as $page_value => $page_name ) {
										printf( '<option value="%s" %s>%s</option>', esc_attr( $page_value ), selected( $equivalent_currency_page, $page_value ), esc_html( $page_name ) );
									}
									?>
                                </select>
                                <p class="description">
									<?php esc_html_e( 'Display currencies both in the store pages and checkout page if they are different at the checkout page.', 'woocommerce-multi-currency' ) ?>
									<?php esc_html_e( "This option and Fixed price option don't work together", 'woocommerce-multi-currency' ) ?>
                                </p>
								<?php
								if ( $has_block_page ) { ?>
                                    <p class="description"><?php esc_html_e( 'When use WC cart/checkout block, this option may be not work', 'woocommerce-multi-currency' ) ?></p>
								<?php }
								?>
                            </td>
                        </tr>

                        </tbody>
                    </table>
                </div>
                <!-- Update !-->
                <div class="vi-ui bottom attached tab segment" data-tab="update">
                    <!-- Tab Content !-->
                    <table class="optiontable form-table">
                        <tbody>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Auto Update Exchange Rate', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <select class="vi-ui dropdown fluid"
                                        name="<?php echo esc_attr( self::set_field( 'update_exchange_rate' ) ) ?>">
                                    <option <?php selected( self::get_field( 'update_exchange_rate', 0 ), '0' ) ?>
                                            value="0"><?php esc_html_e( 'No', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '12' ) ?>
                                            value="12"><?php esc_html_e( '5 Minutes ', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '1' ) ?>
                                            value="1"><?php esc_html_e( '30 Minutes ', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '2' ) ?>
                                            value="2"><?php esc_html_e( '1 Hour ', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '3' ) ?>
                                            value="3"><?php esc_html_e( '6 Hours', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '4' ) ?>
                                            value="4"><?php esc_html_e( '1 Day', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '7' ) ?>
                                            value="7"><?php esc_html_e( '2 Days', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '8' ) ?>
                                            value="8"><?php esc_html_e( '3 Days', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '9' ) ?>
                                            value="9"><?php esc_html_e( '4 Days', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '10' ) ?>
                                            value="10"><?php esc_html_e( '5 Days', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '11' ) ?>
                                            value="11"><?php esc_html_e( '6 Days', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '5' ) ?>
                                            value="5"><?php esc_html_e( '1 Week', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( self::get_field( 'update_exchange_rate' ), '6' ) ?>
                                            value="6"><?php esc_html_e( '1 Month', 'woocommerce-multi-currency' ) ?></option>
                                </select>

                                <p class="description"><?php echo esc_html__( 'Exchange will be updated automatically.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Finance API', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
								<?php
								$selected_api = apply_filters( 'wmc_get_finance_api', self::get_field( 'finance_api' ) );
								?>
                                <select class="vi-ui dropdown fluid wmc-finance-api"
                                        name="<?php echo esc_attr( self::set_field( 'finance_api' ) ) ?>">
                                    <option <?php selected( $selected_api, '0' ) ?>
                                            value="0"><?php esc_html_e( 'Default', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '1' ) ?>
                                            value="1"><?php esc_html_e( 'Google Finance', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '2' ) ?>
                                            value="2"><?php esc_html_e( 'Yahoo Finance', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '3' ) ?>
                                            value="3"><?php esc_html_e( 'Cuex', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '4' ) ?>
                                            value="4"><?php esc_html_e( 'Wise', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '5' ) ?>
                                            value="5"><?php esc_html_e( 'Xe', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '6' ) ?>
                                            value="6"><?php esc_html_e( 'Open exchange rates', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '7' ) ?>
                                            value="7"><?php esc_html_e( 'Exchagerate API', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '8' ) ?>
                                            value="8"><?php esc_html_e( 'Currencyapi', 'woocommerce-multi-currency' ) ?></option>
                                    <option <?php selected( $selected_api, '99' ) ?>
                                            value="99"><?php esc_html_e( 'Custom', 'woocommerce-multi-currency' ) ?></option>
									<?php do_action( 'wmc_finance_api_options', $selected_api ) ?>
                                </select>
                                <p class="description"><?php echo esc_html__( 'Exchange rate resources.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo esc_html__( 'Each Finance resources may not support some currencies, when this occurs, the rate of un support currency will not change, or Finance API will return an error and all currency rates will keep the same.', 'woocommerce-multi-currency' ) ?></p>
                                <p class="description"><?php echo esc_html__( 'If you select "Custom", you can custom exchange rate via "wmc_get_currency_exchange_rates" hook', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr class="wmc-wise-api-token">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'wise_api_token' ) ) ?>">
									<?php esc_html_e( "Wise Api token", 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text" name="<?php echo esc_attr( self::set_field( 'wise_api_token' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'wise_api_token' ) ) ?>"/>

                                <p class="description"><?php echo esc_html__( 'Go to ', 'woocommerce-multi-currency' ) .
								                                  '<a target="_blank" href="' . esc_url( 'https://sandbox.transferwise.tech/' ) . '">Wise Sandbox</a>' .
								                                  esc_html__( ' create an account, create an API Token, and paste it here.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr class="wmc-open-exchange-rates">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'openexchangerates_app_id' ) ) ?>">
									<?php esc_html_e( "Open exchange rates App ID", 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text"
                                       name="<?php echo esc_attr( self::set_field( 'openexchangerates_app_id' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'openexchangerates_app_id' ) ) ?>"/>
                                <p class="description"><?php echo esc_html__( 'Go to ', 'woocommerce-multi-currency' ) .
								                                  '<a target="_blank" href="' . esc_url( 'https://openexchangerates.org/' ) . '">Open exchange rates</a>' .
								                                  esc_html__( ' create an account, create an App ID, and paste it here.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr class="wmc-exchangeratesapi-rates">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'exchangeratesapi_key' ) ) ?>">
									<?php esc_html_e( "Exchagerate API Access Key", 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text"
                                       name="<?php echo esc_attr( self::set_field( 'exchangeratesapi_key' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'exchangeratesapi_key' ) ) ?>"/>
                                <p class="description"><?php echo esc_html__( 'Go to ', 'woocommerce-multi-currency' ) .
								                                  '<a target="_blank" href="' . esc_url( 'https://exchangeratesapi.io/' ) . '">Exchagerate API</a>' .
								                                  esc_html__( ' create an account, create an API Access Key, and paste it here.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr class="wmc-currencyapi-rates">
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'currencyapi_key' ) ) ?>">
									<?php esc_html_e( "Currencyapi API Key", 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <input type="text" name="<?php echo esc_attr( self::set_field( 'currencyapi_key' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'currencyapi_key' ) ) ?>"/>
                                <p class="description"><?php echo esc_html__( 'Go to ', 'woocommerce-multi-currency' ) .
								                                  '<a target="_blank" href="' . esc_url( 'https://currencyapi.com/' ) . '">Currency API</a>' .
								                                  esc_html__( ' create an account, create an API Key, and paste it here.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Rate Decimals', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <div class="vi-ui input fluid">
                                    <input type="number" min="0" step="1"
                                           name="<?php echo esc_attr( self::set_field( 'rate_decimals' ) ) ?>"
                                           value="<?php echo esc_attr( self::get_field( 'rate_decimals', 5 ) ) ?>"/>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="<?php echo esc_attr( self::set_field( 'enable_send_email' ) ) ?>">
									<?php esc_html_e( 'Send Email', 'woocommerce-multi-currency' ) ?>
                                </label>
                            </th>
                            <td>
                                <div class="vi-ui toggle checkbox">
                                    <input id="<?php echo esc_attr( self::set_field( 'enable_send_email' ) ) ?>"
                                           type="checkbox" <?php checked( self::get_field( 'enable_send_email' ), 1 ) ?>
                                           tabindex="0" class="hidden" value="1"
                                           name="<?php echo esc_attr( self::set_field( 'enable_send_email' ) ) ?>"/>
                                    <label></label>
                                </div>
                                <p class="description"><?php esc_html_e( 'Send email to admin when exchange rate is updated.', 'woocommerce-multi-currency' ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label><?php esc_html_e( 'Custom Email', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <input type="email" name="<?php echo esc_attr( self::set_field( 'email_custom' ) ) ?>"
                                       value="<?php echo esc_attr( self::get_field( 'email_custom' ) ) ?>"/>

                                <p class="description"><?php echo esc_html__( 'If empty, notification will be sent to', 'woocommerce-multi-currency' ) . ' ' . esc_html( get_option( 'admin_email' ) ) ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                <label for="auto-update-key"><?php esc_html_e( 'Auto Update Key', 'woocommerce-multi-currency' ) ?></label>
                            </th>
                            <td>
                                <div class="fields">
                                    <div class="ten wide field">
                                        <input type="text" name="<?php echo esc_attr( self::set_field( 'key' ) ) ?>"
                                               id="auto-update-key"
                                               class="villatheme-autoupdate-key-field"
                                               value="<?php echo esc_attr( self::get_field( 'key' ) ) ?>">
                                    </div>
                                    <div class="six wide field">
                                        <span class="vi-ui button green villatheme-get-key-button"
                                              data-href="https://api.envato.com/authorization?response_type=code&client_id=villatheme-download-keys-6wzzaeue&redirect_uri=https://villatheme.com/update-key"
                                              data-id="20948446"><?php echo esc_html__( 'Get Key', 'woocommerce-multi-currency' ) ?></span>
                                    </div>
                                </div>

								<?php do_action( 'woocommerce-multi-currency_key' ) ?>
                                <p class="description"><?php echo sprintf( '%1$s <a target="_blank" href="https://villatheme.com/my-download">https://villatheme.com/my-download</a>. %2$s <a target="_blank" href="https://villatheme.com/knowledge-base/how-to-use-auto-update-feature/">guide</a>', esc_html__( 'Please fill your key what you get from', 'woocommerce-multi-currency' ), esc_html__( 'You can automatically update WooCommerce Multi Currency plugin. See', 'woocommerce-multi-currency' ) ) ?></p>
                            </td>
                        </tr>

                        </tbody>
                    </table>
                </div>
                <p class="wmc-save-settings-container">
                    <button class="vi-ui button labeled icon primary wmc-submit">
                        <i class="send icon"></i> <?php esc_html_e( 'Save', 'woocommerce-multi-currency' ) ?>
                    </button>
                    <button class="vi-ui button labeled icon wmc-submit"
                            name="<?php echo esc_attr( self::set_field( 'check_key' ) ) ?>">
                        <i class="send icon"></i> <?php esc_html_e( 'Save & Check Key', 'woocommerce-multi-currency' ) ?>
                    </button>
                </p>
            </form>
        </div>
		<?php
		do_action( 'villatheme_support_woocommerce-multi-currency' );
	}

	/**
	 * Set Nonce
	 * @return string
	 */
	protected static function set_nonce() {
		return wp_nonce_field( 'woo_multi_currency_settings', '_woo_multi_currency_nonce' );
	}

	/**
	 * Set field in meta box
	 *
	 * @param      $field
	 * @param bool $multi
	 *
	 * @return string
	 */
	protected static function set_field( $field, $multi = false ) {
		if ( $field ) {
			if ( $multi ) {
				return 'woo_multi_currency_params[' . $field . '][]';
			} else {
				return 'woo_multi_currency_params[' . $field . ']';
			}
		} else {
			return '';
		}
	}

	/**
	 * @param $field
	 * @param string $default
	 *
	 * @return string|array|bool
	 */
	public static function get_field( $field, $default = '' ) {
		global $wmc_settings;
		$params = $wmc_settings;

		if ( self::$params ) {
			$params = self::$params;
		} else {
			self::$params = $params;
		}
		if ( isset( $params[ $field ] ) && $field ) {
			return $params[ $field ];
		} else {
			return $default;
		}
	}

	/**
	 * Check element in array
	 *
	 * @param $arg
	 * @param $index
	 *
	 * @return bool
	 */
	static protected function data_isset( $arg, $index, $default = false ) {
		if ( isset( $arg[ $index ] ) ) {
			return $arg[ $index ];
		} else {
			return $default;
		}
	}

	public function woomulticurrency_exchange() {
		check_ajax_referer( 'wmc-admin-settings-nonce', '_ajax_nonce' );
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Sorry you are not allowed to do this.' );
		}
		$orginal_price    = isset( $_POST['original_price'] ) ? sanitize_text_field( wp_unslash( $_POST['original_price'] ) ) : '';
		$other_currencies = isset( $_POST['other_currencies'] ) ? sanitize_text_field( wp_unslash( $_POST['other_currencies'] ) ) : '';
		$data             = WOOMULTI_CURRENCY_Data::get_ins();
		$rates            = $data->get_exchange( $orginal_price, $other_currencies );
		wp_send_json( $rates );
	}

	/**
	 * @return bool|void
	 */
	public function save_settings() {
		global $wmc_settings;
		$page = isset( $_REQUEST['page'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['page'] ) ) : '';
		if ( $page === 'woocommerce-multi-currency' ) {
			if ( is_plugin_active( 'sitepress-multilingual-cms/sitepress.php' ) ) {
				global $sitepress;
				$default_lang           = $sitepress->get_default_language();
				self::$default_language = $default_lang;
				$languages              = icl_get_languages( 'skip_missing=N&orderby=KEY&order=DIR&link_empty_to=str' );
				self::$languages_data   = $languages;
				if ( count( $languages ) ) {
					foreach ( $languages as $key => $language ) {
						if ( $key != $default_lang ) {
							self::$languages[] = $key;
						}
					}
				}
			} elseif ( class_exists( 'Polylang' ) && function_exists( 'pll_default_language' ) ) {
				/*Polylang*/
				$languages    = pll_languages_list();
				$default_lang = pll_default_language( 'slug' );
				foreach ( $languages as $language ) {
					if ( $language == $default_lang ) {
						continue;
					}
					self::$languages[] = $language;
				}
			}
		}

		if ( ! isset( $_POST['_woo_multi_currency_nonce'] ) || ! isset( $_POST['woo_multi_currency_params'] ) ) {
			return false;
		}
		if ( ! wp_verify_nonce( $_POST['_woo_multi_currency_nonce'], 'woo_multi_currency_settings' ) ) {
			return false;
		}
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return false;
		}
		$old_api                  = self::$settings->get_params( 'finance_api' );
		$update_exchange_rate     = self::$settings->get_params( 'update_exchange_rate' );
		$data                     = $_POST['woo_multi_currency_params'];
		$data['conditional_tags'] = $this->stripslashes_deep( $data['conditional_tags'] );
		$data['custom_css']       = $this->stripslashes_deep( $data['custom_css'] );

		/*Override WooCommerce Currency*/
		if ( isset( $data['currency_default'] ) && $data['currency_default'] && isset( $data['currency'] ) ) {
			update_option( 'woocommerce_currency', $data['currency_default'] );
			$index = array_search( $data['currency_default'], $data['currency'] );
			/*Override WooCommerce Currency*/
			if ( isset( $data['currency_pos'][ $index ] ) && $index && $data['currency_pos'][ $index ] ) {
				update_option( 'woocommerce_currency_pos', $data['currency_pos'][ $index ] );
			}
			if ( isset( $data['currency_decimals'][ $index ] ) ) {
				update_option( 'woocommerce_price_num_decimals', $data['currency_decimals'][ $index ] );
			}
		}
		if ( isset( $data['enable_wpml'] ) && $data['enable_wpml'] ) {
			$wpml_settings                                                                               = get_option( 'icl_sitepress_settings' );
			$wpml_settings['translation-management']['custom_fields_translation']['wmc_order_info']      = 1;
			$wpml_settings['translation-management']['custom_fields_translation']['_regular_price_wmcp'] = 1;
			$wpml_settings['translation-management']['custom_fields_translation']['_sale_price_wmcp']    = 1;
			update_option( 'icl_sitepress_settings', $wpml_settings );
		}


		if ( isset( $data['checkout_currency'] ) && $data['checkout_currency'] && isset( $data['checkout_currency_args'] ) && is_array( $data['checkout_currency_args'] ) ) {
			if ( ! in_array( $data['checkout_currency'], $data['checkout_currency_args'] ) ) {
				$data['checkout_currency_args'][] = $data['checkout_currency'];
			}
		}

		if ( isset( $data['add_all_currencies'] ) ) {
			$max_input_vars = ini_get( 'max_input_vars' );
			if ( $max_input_vars < 3000 ) {
				add_action( 'admin_notices', function () {
					?>
                    <div id="message" class="error">
                        <p><?php esc_html_e( 'Please increase PHP Max Input Vars more than 3000 in php.ini to use this option.', 'woocommerce-multi-currency' ); ?></p>
                    </div>
					<?php
				} );
			} else {
				$wc_currencies               = get_woocommerce_currencies();
				$all_currencies              = array_keys( array_unique( $wc_currencies ) );
				$count_currency              = count( $all_currencies );
				$currency_hidden             = array_fill( 0, $count_currency, '0' );
				$currency_pos                = array_fill( 0, $count_currency, 'left' );
				$currency_rate               = array_fill( 0, $count_currency, 1 );
				$currency_decimals           = array_fill( 0, $count_currency, 2 );
				$currency_custom             = array_fill( 0, $count_currency, '' );
				$currency_thousand_separator = array_fill( 0, $count_currency, '' );
				$currency_decimal_separator  = array_fill( 0, $count_currency, '' );

				$data['currency']                    = $all_currencies;
				$data['currency_hidden']             = $currency_hidden;
				$data['currency_pos']                = $currency_pos;
				$data['currency_rate']               = $currency_rate;
				$data['currency_decimals']           = $currency_decimals;
				$data['currency_custom']             = $currency_custom;
				$data['currency_thousand_separator'] = $currency_thousand_separator;
				$data['currency_decimal_separator']  = $currency_decimal_separator;
				$data['checkout_currency_args']      = $currency_hidden;
				$data['currency_rate_fee']           = $currency_hidden;
			}
		}

		if ( isset( $data['currency'] ) && is_array( $data['currency'] ) && count( $data['currency'] ) > 100 ) {
			$max_input_vars = ini_get( 'max_input_vars' );
			if ( $max_input_vars <= 1000 ) {
				add_action( 'admin_notices', function () {
					?>
                    <div id="message" class="error">
                        <p><?php esc_html_e( 'Your settings maybe unsaved, please increase PHP Max Input Vars in php.ini to use.', 'woocommerce-multi-currency' ); ?></p>
                    </div>
					<?php
				} );
			}
		}

		if ( isset( $data['delete_all_currencies'] ) ) {
			$default_currency                    = ! empty( $data['currency_default'] ) ? $data['currency_default'] : get_option( 'woocommerce_currency' );
			$data['currency']                    = array( $default_currency );
			$data['currency_hidden']             = array( 0 );
			$data['currency_pos']                = array( 'left' );
			$data['currency_rate']               = array( 1 );
			$data['currency_decimals']           = array( 2 );
			$data['currency_custom']             = array( '' );
			$data['currency_thousand_separator'] = array( '' );
			$data['currency_decimal_separator']  = array( '' );
			$data['checkout_currency_args']      = array( $default_currency );
			$data['currency_rate_fee']           = array( 0 );
		}

		if ( isset( $data['beauty_price_currencies'] ) ) {
			$data['beauty_price_currencies'] = $this->sort_select_option( $data['beauty_price_currencies'] );
		}

		if ( isset( $data['wmc_get_country_by_currency'] ) ) {
			if ( ! empty( $data['currency'] ) && is_array( $data['currency'] ) ) {
				$currency_data = new WOOMULTI_CURRENCY_Data();
				$eu_countries  = array(
					/*Member*/
					'AT',
					'BE',
					'CY',
					'EE',
					'FI',
					'FR',
					'DE',
					'GR',
					'IE',
					'IT',
					'LV',
					'LT',
					'LU',
					'MT',
					'NL',
					'PT',
					'SK',
					'SI',
					'ES',
					/*Non-member*/
					'BG',
					'HR',
					'CZ',
					'HU',
					'PL',
					'RO',
					'SE',
					/*Member countries with an opt-out*/
					'DK',
				);
				foreach ( $data['currency'] as $currency ) {
					$country                           = $currency_data->get_country_data( $currency );
					$data[ $currency . '_by_country' ] = array( $country['code'] );
					$search                            = array_search( $country['code'], $eu_countries );
					if ( $search !== false ) {
						unset( $eu_countries[ $search ] );
					}
				}
				if ( isset( $data['EUR_by_country'] ) ) {
					$data['EUR_by_country'] = array_merge( $eu_countries, $data['EUR_by_country'] );
				}
			}
		}
		if ( isset( $data['check_key'] ) ) {
			unset( $data['check_key'] );
			delete_site_transient( 'update_plugins' );
			delete_transient( 'villatheme_item_5455' );
			delete_option( 'woocommerce-multi-currency_messages' );
			do_action( 'villatheme_save_and_check_key_woocommerce-multi-currency', $data['key'] );
		}
		$wmc_settings = array_merge( $wmc_settings, $data );
		update_option( 'woo_multi_currency_params', $data );
		if ( $old_api !== $data['finance_api'] || $update_exchange_rate !== $data['update_exchange_rate'] ) {
			delete_transient( 'wmc_update_exchange_rate' );
		}

		self::$settings = WOOMULTI_CURRENCY_Data::get_ins( true );
	}

	private function stripslashes_deep( $value ) {
		$value = is_array( $value ) ? array_map( 'stripslashes_deep', $value ) : stripslashes( $value );

		return $value;
	}

	public function sort_select_option( $data ) {
		$tmp = array();
		foreach ( $data as $el ) {
			$tmp[] = is_array( $el ) ? array_filter( $el ) : $el;
		}

		return $tmp;
	}

	public function admin_enqueue_scripts() {
		$currencies = self::get_field( 'currency' );
		wp_localize_script( 'woocommerce-multi-currency', 'wmcParams', array(
			'currencies'    => $currencies,
			'_ajax_nonce'   => wp_create_nonce( 'wmc-admin-settings-nonce' ),
			'i18n_integer'  => esc_html__( 'Integer', 'woocommerce-multi-currency' ),
			'i18n_fraction' => esc_html__( 'Fraction', 'woocommerce-multi-currency' ),
		) );
	}

	private static function default_language_flag_html( $name = '' ) {
		if ( self::$default_language ) {
			?>
            <p>
                <label for="<?php echo esc_attr( $name ) ?>"><?php
					if ( isset( self::$languages_data[ self::$default_language ]['country_flag_url'] ) && self::$languages_data[ self::$default_language ]['country_flag_url'] ) {
						?>
                        <img src="<?php echo esc_url( self::$languages_data[ self::$default_language ]['country_flag_url'] ); ?>">
						<?php
					}
					echo esc_html( self::$default_language );
					if ( isset( self::$languages_data[ self::$default_language ]['translated_name'] ) ) {
						echo '(' . esc_html( self::$languages_data[ self::$default_language ]['translated_name'] ) . '):';
					}
					?></label>
            </p>
			<?php
		}
	}
}