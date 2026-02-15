<?php

/**
 * Class WOOMULTI_CURRENCY_Frontend_Shortcode
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Frontend_Shortcode {
	protected $settings;
	protected $price_args;
	protected $current_url;

	public function __construct() {
		$this->settings   = WOOMULTI_CURRENCY_Data::get_ins();
		$this->price_args = array();
		add_action( 'init', array( $this, 'shortcode_init' ) );
		add_filter( 'wmc_shortcode', array( $this, 'replace_shortcode' ), 10, 2 );
		if ( ! isset( $_REQUEST['_woo_multi_currency_nonce'] ) || wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			$this->current_url = ! empty( $_POST['wmc_current_url'] ) ? sanitize_text_field( $_POST['wmc_current_url'] ) : remove_query_arg( 'wmc-currency' );
		}
	}

	public function check_conditional() {
		$logic_value = $this->settings->get_conditional_tags();
		$result      = true;

		if ( $logic_value ) {
			if ( stristr( $logic_value, "return" ) === false ) {
				$logic_value = "return (" . $logic_value . ");";
			}
			try {
				if ( ! eval( $logic_value ) ) {// phpcs:ignore 	Generic.PHP.ForbiddenFunctions.Found
					return false;
				}
			} catch ( Error $e ) {
				trigger_error( esc_html( $e->getMessage() ), E_USER_WARNING );

				return false;
			} catch ( Exception $e ) {
				trigger_error( esc_html( $e->getMessage() ), E_USER_WARNING );

				return false;
			}
		}

		return $result;
	}

	public static function get_shortcode_id() {
		global $wmc_shortcode_id;
		if ( $wmc_shortcode_id === null ) {
			$wmc_shortcode_id = 1;
		} else {
			$wmc_shortcode_id ++;
		}

		return "woocommerce-multi-currency-{$wmc_shortcode_id}";
	}

	public function shortcode_init() {
		$items = $this->settings->get_list_shortcodes();
		foreach ( $items as $k => $item ) {
			if ( $k ) {
				add_shortcode( 'woo_multi_currency_' . $k, array( $this, 'shortcode_' . $k ) );
			}
		}
		add_shortcode( 'woo_multi_currency', array( $this, 'shortcode_woo_multi_currency' ) );
		add_shortcode( 'woo_multi_currency_exchange', array( $this, 'woo_multi_currency_exchange' ) );
		add_shortcode( 'woo_multi_currency_rates', array( $this, 'woo_multi_currency_rates' ) );
		add_shortcode( 'woo_multi_currency_flatsome_mobile_menu', array( $this, 'shortcode_flatsome_mobile_menu' ) );
		add_shortcode( 'woo_multi_currency_product_price_switcher', array( $this, 'product_price_switcher' ) );
		add_shortcode( 'woo_multi_currency_convertor', array( $this, 'currency_convertor' ) );
		add_shortcode( 'woo_multi_currency_product_collate', array( $this, 'product_price_collate' ) );
		add_shortcode( 'woo_multi_currency_single_product_collate', array( $this, 'single_product_price_collate' ) );
	}

	public function product_price_switcher( $atts ) {
		$args = shortcode_atts( array(
			'product_id' => '',
		), $atts );
		global $post;
		$product_id = ! empty( $args['product_id'] ) ? $args['product_id'] : '';
		if ( ! $product_id ) {
			if ( is_object( $post ) && $post->ID && $post->post_type == 'product' && $post->post_status == 'publish' ) {
				$product_id = $post->ID;
			}
		}
		$price_switcher = '';
		if ( $product_id ) {
			$product               = wc_get_product( $product_id );
			$links                 = $this->settings->get_links();
			$current_currency      = $this->settings->get_current_currency();
			$country               = $this->settings->get_country_data( $current_currency );
			$list_currencies       = $this->settings->get_list_currencies();
			$switch_currency_by_js = $this->settings->enable_switch_currency_by_js();
			$class                 = array( 'wmc-price-switcher' );
			$switcher_style        = $this->settings->get_price_switcher();
			$currency_name         = get_woocommerce_currencies();
			$c_currency_name       = isset( $currency_name[ $current_currency ] ) ? $currency_name[ $current_currency ] : '';
			$default_symbol        = isset( $list_currencies[ $current_currency ] ) && isset( $list_currencies[ $current_currency ]['custom'] ) &&
			                         '' != $list_currencies[ $current_currency ]['custom'] ? $list_currencies[ $current_currency ]['custom'] : get_woocommerce_currency_symbol( $current_currency );

			$switcher_layout = $this->settings->get_param( 'price_switcher_layout' );
			if ( $switcher_layout == 'split' ) {
				$class[] = 'wmc-switcher-layout-split';
			} else {
				$class[] = 'wmc-switcher-layout-full';
			}

			if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
				$class[] = 'wmc-currency-trigger-click';
			}
			$currency_symbol = '';
			wp_enqueue_style( 'wmc-flags', WOOMULTI_CURRENCY_CSS . 'flags-64.min.css', '', WOOMULTI_CURRENCY_VERSION );
//			wp_enqueue_style( 'wmc-flags-48', WOOMULTI_CURRENCY_CSS . 'flags-48.min.css', '', WOOMULTI_CURRENCY_VERSION );
			ob_start();
			?>
            <div class="woocommerce-multi-currency <?php echo esc_attr( implode( ' ', $class ) ) ?>"
                 id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
                 title="<?php esc_attr_e( 'Please select your currency', 'woocommerce-multi-currency' ) ?>">
                <div class="wmc-currency-wrapper">
                        <span class="wmc-current-currency">
                            <?php switch ( $switcher_style ) {
	                            case 1:
	                            case 2:
	                            case 3: ?>
                                    <i style="transform: scale(0.8);"
                                       class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "></i>
		                            <?php break;
	                            case 4: ?>
                                    <span class="wmc-prd-switcher-display <?php echo esc_attr( strtolower( $country['code'] ) ) ?> ">
                                    <?php echo esc_html( $default_symbol ); ?>
                                </span>
		                            <?php break;
	                            case 5: ?>
                                    <span class="wmc-prd-switcher-line-wrap wmc-prd-switcher-display <?php echo esc_attr( strtolower( $country['code'] ) ) ?> ">
                                        <span class="wmc-prd-switcher-line-code"><?php echo esc_attr( apply_filters( 'wmc_price_switcher_current_currency_code', $current_currency ) ); ?></span>
                                        <span class="wmc-prd-switcher-line-name"><?php echo esc_attr( apply_filters( 'wmc_price_switcher_current_currency_name', $c_currency_name, $current_currency ) ); ?></span>
                                    </span>
		                            <?php break;
                            } ?>
                        </span>
                    <div class="wmc-sub-currency">
						<?php
						foreach ( $links as $k => $link ) {
							$sub_class = array( 'wmc-currency' );
							if ( $k === $current_currency ) {
								$sub_class[] = 'wmc-hidden';
							}
							$c_currency_name = isset( $currency_name[ $k ] ) ? $currency_name[ $k ] : '';
							$country         = $this->settings->get_country_data( $k );
							if ( 3 < (int) $switcher_style ) {
								$currency_symbol = isset( $list_currencies[ $k ] ) && isset( $list_currencies[ $k ]['custom'] ) &&
								                   '' != $list_currencies[ $k ]['custom'] ? $list_currencies[ $k ]['custom'] : get_woocommerce_currency_symbol( $k );
							}
							?>
                            <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>"
                                 data-currency="<?php echo esc_attr( $k ) ?>"
                                 data-symbol="<?php echo esc_attr( $currency_symbol ) ?>">
                                <a rel="nofollow" title="<?php echo esc_attr( $country['name'] ) ?>"
                                   href="<?php echo esc_url( $switch_currency_by_js ? '#' : $link ) ?>"
                                   class="wmc-currency-redirect" data-currency="<?php echo esc_attr( $k ) ?>">
									<?php switch ( (int) $switcher_style ) {
										case 1:
										case 2:
										case 3: ?>
                                            <i style="transform: scale(0.8);"
                                               class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "></i>
											<?php break;
										case 4:
											?>
                                            <span class="wmc-prd-switcher-data <?php echo esc_attr( strtolower( $country['code'] ) ) ?> ">
                                            <?php echo wp_kses_post( $currency_symbol ); ?>
                                            </span>
											<?php break;
										case 5:
											?>
                                            <span class="wmc-prd-switcher-line-wrap wmc-prd-switcher-data <?php echo esc_attr( strtolower( $country['code'] ) ) ?> ">
                                                <span class="wmc-prd-switcher-line-code"><?php echo esc_attr( apply_filters( 'wmc_price_switcher_current_currency_code', $k ) ); ?></span>
                                                <span class="wmc-prd-switcher-line-name"><?php echo esc_attr( apply_filters( 'wmc_price_switcher_current_currency_name', $c_currency_name, $k ) ); ?></span>
                                            </span>
											<?php break;
									} ?>
									<?php
									switch ( $switcher_style ) {
										case 2:
											echo '<span class="wmc-price-switcher-code">' . esc_html( $k ) . '</span>';
											break;
										case 3:
											$decimals           = (int) $list_currencies[ $k ]['decimals'];
											$decimal_separator  = wc_get_price_decimal_separator();
											$thousand_separator = wc_get_price_thousand_separator();
											$symbol             = $list_currencies[ $k ]['custom'];
											$symbol             = $symbol ? $symbol : get_woocommerce_currency_symbol( $k );
											$format             = WOOMULTI_CURRENCY_Data::get_price_format( $list_currencies[ $k ]['pos'] );
											$price              = 0;
											$max_price          = '';
											$custom_symbol      = strpos( $symbol, '#PRICE#' );
											if ( $product->get_type() == 'variable' ) {
												$price     = WOOMULTI_CURRENCY_Frontend_Price::get_variation_min_price( $product, $k );
												$price_max = WOOMULTI_CURRENCY_Frontend_Price::get_variation_max_price( $product, $k );
												if ( $price_max > $price ) {
													$price_max = number_format( wc_get_price_to_display( $product, array(
														'qty'   => 1,
														'price' => $price_max
													) ), $decimals, $decimal_separator, $thousand_separator );
													if ( $custom_symbol === false ) {
														$max_price = ' - ' . sprintf( $format, $symbol, $price_max );
													} else {
														$max_price = ' - ' . str_replace( '#PRICE#', $price_max, $symbol );
													}
												}
											} else {
												if ( $this->settings->check_fixed_price() ) {
													$product_id    = $product->get_id();
													$product_price = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_regular_price_wmcp', true ), true ) );
													$sale_price    = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_sale_price_wmcp', true ), true ) );
													if ( isset( $product_price[ $k ] ) && ! $product->is_on_sale( 'edit' ) && $product_price[ $k ] > 0 ) {
														$price = $product_price[ $k ];
													} elseif ( isset( $sale_price[ $k ] ) && $sale_price[ $k ] > 0 ) {
														$price = $sale_price[ $k ];
													}
												}
											}
											if ( ! $price && $product->get_price( 'edit' ) ) {
												$price = $product->get_price( 'edit' );
												$price = number_format( wmc_get_price( wc_get_price_to_display( $product, array(
													'qty'   => 1,
													'price' => $price
												) ), $k ), $decimals, $decimal_separator, $thousand_separator );
											} else {
												$price = number_format( wc_get_price_to_display( $product, array(
													'qty'   => 1,
													'price' => $price
												) ), $decimals, $decimal_separator, $thousand_separator );
											}

											if ( $custom_symbol === false ) {
												$formatted_price = sprintf( $format, $symbol, $price );
											} else {
												$formatted_price = str_replace( '#PRICE#', $price, $symbol );
											}
											echo '<span class="wmc-price-switcher-price">' . wp_kses_post( $formatted_price ) . wp_kses_post( $max_price ) . '</span>';
											break;
										case 4:
											break;
									}
									?>
                                </a>
                            </div>
							<?php
						}
						?>
                    </div>
                </div>
            </div>
			<?php
			$price_switcher = ob_get_clean();
		}

		return $price_switcher;
	}

	/**
	 * Shortcode Currency selector
	 */
	public function shortcode_woo_multi_currency() {
		$args = array( 'settings' => WOOMULTI_CURRENCY_Data::get_ins(), 'shortcode' => 'default' );
		ob_start();
		wmc_get_template( 'woo-multi-currency-selector.php', $args );

		return ob_get_clean();
	}

	/**
	 * Replace shortcode
	 *
	 * @param $shortcode
	 * @param $data
	 *
	 * @return string
	 */
	public function replace_shortcode( $shortcode, $data ) {
		$layout    = isset( $data['layout'] ) ? $data['layout'] : '';
		$flag_size = isset( $data['flag_size'] ) ? $data['flag_size'] : '';
		$attr      = '';

		if ( $flag_size ) {
			$attr = 'flag_size =' . $flag_size;
		}
		if ( $layout ) {
			$shortcode = '[woo_multi_currency_' . $layout . ' ' . $attr . ']';
		}

		return $shortcode;
	}

	/**
	 * Shortcode show list currency rates
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return float|int|string
	 */
	public function woo_multi_currency_rates( $atts, $content = null ) {
		extract(
			shortcode_atts(
				array(
					'currencies' => '',
				), $atts
			)
		);
		if ( $currencies ) {
			$currencies = array_map( 'strtoupper', array_map( 'trim', array_filter( explode( ',', $currencies ) ) ) );
		} else {
			$currencies = array();
		}
		$list_currencies  = $this->settings->get_list_currencies();
		$currency_default = $this->settings->get_default_currency();
		ob_start(); ?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode wmc-list-currency-rates">
			<?php
			if ( count( $currencies ) ) {
				foreach ( $currencies as $currency ) {
					if ( array_key_exists( $currency, $list_currencies ) ) {
						if ( $currency == $currency_default ) {
							continue;
						} ?>
                        <div class="wmc-currency-rate">
							<?php echo esc_html( $currency_default ) . '/' . esc_html( $currency ) ?> = <?php
							echo esc_html( $list_currencies[ $currency ]['rate'] );
							?>
                        </div>
					<?php }
				}
			} else {
				foreach ( $list_currencies as $key => $currency ) {
					if ( $key == $currency_default ) {
						continue;
					} ?>
                    <div class="wmc-currency-rate">
						<?php echo esc_html( $currency_default ) . '/' . esc_html( $key ) ?> = <?php
						echo esc_html( $currency['rate'] );
						?>
                    </div>
				<?php }
			} ?>
        </div>
		<?php
		return ob_get_clean();
	}

	/**
	 * @param $atts
	 *
	 * @return string
	 */
	public function woo_multi_currency_exchange( $atts ) {
		global $product;
		extract(
			shortcode_atts(
				array(
					'price'          => '',
					'original_price' => '',
					'currency'       => '',
					'product_id'     => '',
					'keep_format'    => 1,
				), $atts
			)
		);
		if ( $product_id ) {
			$product_obj = wc_get_product( $product_id );
		} elseif ( ! $price ) {
			$product_obj = $product;
		}
		if ( isset( $product_obj ) && is_a( $product_obj, 'WC_Product' ) ) {
			if ( $keep_format && ! $currency || $currency === $this->settings->get_current_currency() ) {
				$price = $product_obj->get_price_html();

				return $price;
			} else {
				$price = $product_obj->get_price( 'edit' );
				if ( $product_obj->is_on_sale() ) {
					$original_price = $product_obj->get_regular_price( 'edit' );
				}
			}
		}
		if ( $price ) {
			$product_id          = esc_attr( $product_id );
			$keep_format         = esc_attr( $keep_format );
			$price               = esc_attr( $price );
			$original_price      = esc_attr( $original_price );
			$currency            = esc_attr( $currency );
			$selected_currencies = $this->settings->get_list_currencies();
			if ( $currency && isset( $selected_currencies[ $currency ] ) && is_array( $selected_currencies[ $currency ] ) ) {
				$data   = $selected_currencies[ $currency ];
				$format = WOOMULTI_CURRENCY_Data::get_price_format( $data['pos'] );
				$args   = array(
					'currency'     => $currency,
					'price_format' => $format
				);
				if ( isset( $data['decimals'] ) ) {
					$args['decimals'] = absint( $data['decimals'] );
				}

				if ( $original_price && $original_price > $price ) {
					$this->price_args = $args;
					add_filter( 'wc_price_args', array(
						$this,
						'change_price_format_by_specific_currency'
					), PHP_INT_MAX );
					$price_html = wc_format_sale_price( wmc_get_price( $original_price, $currency ), wmc_get_price( $price, $currency ) );
					remove_filter( 'wc_price_args', array(
						$this,
						'change_price_format_by_specific_currency'
					), PHP_INT_MAX );
					$this->price_args = array();

					return "<span class='wmc-cache-value' data-product_id='{$product_id}' data-keep_format='{$keep_format}' data-price='{$price}' data-original_price='{$original_price}' data-currency='{$currency}' >" . $price_html . '</span>';
				} else {
					return "<span class='wmc-cache-value' data-product_id='{$product_id}' data-keep_format='{$keep_format}' data-price='{$price}' data-original_price='{$original_price}' data-currency='{$currency}' >" . wc_price( wmc_get_price( $price, $currency ), $args ) . '</span>';
				}

			} else {
				if ( $original_price && $original_price > $price ) {
					return "<span class='wmc-cache-value' data-product_id='{$product_id}' data-keep_format='{$keep_format}' data-price='{$price}' data-original_price='{$original_price}' data-currency='{$currency}' >" . wc_format_sale_price( wmc_get_price( $original_price ), wmc_get_price( $price ) ) . '</span>';
				} else {
					return "<span class='wmc-cache-value' data-product_id='{$product_id}' data-keep_format='{$keep_format}' data-price='{$price}' data-original_price='{$original_price}' data-currency='{$currency}' >" . wc_price( wmc_get_price( $price ) ) . '</span>';
				}
			}
		} else {
			return '';
		}
	}

	public function change_price_format_by_specific_currency( $args ) {
		if ( count( $this->price_args ) ) {
			$args = wp_parse_args( $this->price_args, $args );
		}

		return $args;
	}

	/**
	 * Shortcode plain horizontal
	 * @return string
	 */
	public function shortcode_plain_horizontal( $atts, $content = null ) {
		extract(
			shortcode_atts(
				array(
					'title' => ''
				), $atts
			)
		);
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}
		$current_currency = $this->settings->get_current_currency();
		$links            = $this->settings->get_links();
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-horizontal" data-layout="plain_horizontal">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
			<?php
			foreach ( $links as $k => $link ) {
				$class = '';
				if ( $current_currency == $k ) {
					$class = "wmc-active";
				}
				/*End override*/
				?>
                <div class="wmc-currency <?php echo esc_attr( $class ) ?>">
					<?php
					if ( $this->settings->enable_switch_currency_by_js() ) {
						$link = '#';
					}
					?>
                    <a rel="nofollow" class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                       data-currency="<?php echo esc_attr( $k ) ?>">
						<?php echo wp_kses_post( $k ) ?>
                    </a>
                </div>
				<?php
			}
			?>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	/**
	 * Plain vertical
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return string
	 */
	public function shortcode_plain_vertical_2( $atts, $content = null ) {
		$args = array( 'settings' => WOOMULTI_CURRENCY_Data::get_ins(), 'shortcode' => 'listbox_code' );
		ob_start();
		wmc_get_template( 'woo-multi-currency-selector.php', $args );

		return ob_get_clean();
	}

	public function shortcode_plain_vertical( $atts, $content = null ) {
		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'symbol'        => '',
					'direction'     => '',
					'dropdown_icon' => 'arrow',
				), $atts
			)
		);
		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		$current_symbol   = $symbol ? ' / ' . get_woocommerce_currency_symbol( $current_currency ) : '';

		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}

		$class = $this->get_position_option();
		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}
		if ( isset( $direction ) && 'top' == $direction ) {
			$class .= ' wmc-dropdown-direction-top';
		}
		$arrow = '';
		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-vertical layout0 <?php echo esc_attr( $class ) ?>"
             data-layout="plain_vertical" data-dropdown_icon="<?php echo esc_attr( $dropdown_icon ) ?>"
             data-direction="<?php echo esc_attr( $direction ) ?>">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper" onclick="">
				<span class="wmc-current-currency">
                    <span class="wmc-current-currency-code"><?php echo wp_kses_post( $current_currency . $current_symbol ) ?></span>
					<?php echo wp_kses_post( $arrow ) ?>
				</span>
                <div class="wmc-sub-currency">
					<?php
					foreach ( $links as $k => $link ) {
						$sub_class = array( 'wmc-currency' );
						if ( $current_currency == $k ) {
							$sub_class[] = 'wmc-hidden';
						}
						$sub_symbol = $symbol ? ' / ' . get_woocommerce_currency_symbol( $k ) : '';
						if ( $this->settings->enable_switch_currency_by_js() ) {
							$link = '#';
						}
						?>
                        <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>">
                            <a rel="nofollow" class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $k ) ?>">
								<?php echo wp_kses_post( $k . $sub_symbol ) ?>
                            </a>
                        </div>
						<?php
					}
					?>
                </div>
            </div>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	/**
	 * List Flag Horizontal
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return string
	 */
	public function shortcode_layout3( $atts, $content = null ) {
		$this->enqueue_flag_css();
		extract(
			shortcode_atts(
				array(
					'title'     => '',
					'flag_size' => 0.6
				), $atts
			)
		);
		$current_currency = $this->settings->get_current_currency();
		$links            = $this->settings->get_links();
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}

		$class = $this->get_position_option();

		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-horizontal layout3 <?php echo esc_attr( $class ) ?>"
             data-layout="layout3" data-flag_size="<?php echo esc_attr( $flag_size ) ?>">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
			<?php
			foreach ( $links as $k => $link ) {
				if ( $current_currency ) {
					if ( $current_currency == $k ) {
						$class = "wmc-active";
					} else {
						$class = '';
					}
				}
				/*End override*/
				$country = $this->settings->get_country_data( $k );

				?>
                <div class="wmc-currency <?php echo esc_attr( $class ) ?>">
					<?php
					if ( $this->settings->enable_switch_currency_by_js() ) {
						$link = '#';
					}
					?>
                    <a rel="nofollow" title="<?php echo esc_attr( $country['name'] ) ?>" class="wmc-currency-redirect"
                       href="<?php echo esc_attr( $link ) ?>" data-currency="<?php echo esc_attr( $k ) ?>">
                        <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                           class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "></i>
                    </a>
                </div>
				<?php
			}
			?>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	public function enqueue_flag_css() {
		if ( WP_DEBUG ) {
			wp_enqueue_style( 'wmc-flags', WOOMULTI_CURRENCY_CSS . 'flags-64.css', '', WOOMULTI_CURRENCY_VERSION );
//			wp_enqueue_style( 'wmc-flags-48', WOOMULTI_CURRENCY_CSS . 'flags-48.css', '', WOOMULTI_CURRENCY_VERSION );
		} else {
			wp_enqueue_style( 'wmc-flags', WOOMULTI_CURRENCY_CSS . 'flags-64.min.css', '', WOOMULTI_CURRENCY_VERSION );
//			wp_enqueue_style( 'wmc-flags-48', WOOMULTI_CURRENCY_CSS . 'flags-48.min.css', '', WOOMULTI_CURRENCY_VERSION );
		}
	}

	public function fix_style( $flag_size ) {
		$margin_width = ( 60 - 60 * $flag_size ) / 2;
		$margin_heigh = ( 40 - 40 * $flag_size ) / 2;
		$style        = "transform: scale({$flag_size}); margin: -{$margin_heigh}px -{$margin_width}px";

		return $style;
	}

	/**
	 * List Flags vertical
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return string
	 */
	public function shortcode_layout4( $atts, $content = null ) {
		$this->enqueue_flag_css();
		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'flag_size'     => 0.6,
					'dropdown_icon' => 'arrow',
				), $atts
			)
		);
		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		$country          = $this->settings->get_country_data( $current_currency );
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}
		$class = $this->get_position_option();
		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}
		$arrow = '';
		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-vertical layout4 <?php echo esc_attr( $class ) ?>"
             data-layout="layout4" data-flag_size="<?php echo esc_attr( $flag_size ) ?>"
             data-dropdown_icon="<?php echo esc_attr( $dropdown_icon ) ?>">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper" onclick="">
				<span class="wmc-current-currency">
                       <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                          class="wmc-current-flag vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "> </i>
                    <?php echo wp_kses_post( $arrow ) ?>
				</span>
                <div class="wmc-sub-currency">
					<?php
					foreach ( $links as $k => $link ) {
						$sub_class = array( 'wmc-currency' );
						if ( $current_currency == $k ) {
							$sub_class[] = 'wmc-hidden';
						}
						/*End override*/
						$country = $this->settings->get_country_data( $k );
						?>
                        <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>">
							<?php
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" title="<?php echo esc_attr( $country['name'] ) ?>"
                               class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $k ) ?>">
                                <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                                   class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "></i>
                            </a>
                        </div>
						<?php
					}
					?>
                </div>
            </div>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	public function get_position_option() {
		$class  = '';
		$sticky = $this->settings->get_param( 'shortcode_position' );
		if ( in_array( $sticky, array_keys( WOOMULTI_CURRENCY_Data::$pos_options ) ) ) {
			$class = 'wmc-shortcode-fixed ' . $sticky;
		}

		return $class;
	}

	/**
	 * List Flags + Currency code
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return string
	 */
	public function shortcode_layout5( $atts, $content = null ) {
		$this->enqueue_flag_css();

		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'flag_size'     => 0.6,
					'symbol'        => '',
					'country_name'  => '',
					'dropdown_icon' => 'arrow',
				), $atts
			)
		);

		$links                    = $this->settings->get_links();
		$current_currency         = $this->settings->get_current_currency();
		$country                  = $this->settings->get_country_data( $current_currency );
		$display_current_currency = $country_name ? $country['name'] : $current_currency;
		$display_current_currency = apply_filters( 'wmc_shortcode_custom_currency', $display_current_currency );
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}

		$class = $this->get_position_option();
		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}
		$arrow = '';
		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-vertical layout5 <?php echo esc_attr( $class ) ?>"
             data-layout="layout5" data-flag_size="<?php echo esc_attr( $flag_size ) ?>"
             data-dropdown_icon="<?php echo esc_attr( $dropdown_icon ) ?>">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper">
				<span class="wmc-current-currency" style="line-height: <?php echo esc_attr( $flag_size * 40 ) ?>px">
                    <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                       class="wmc-current-flag vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "> </i>
                    <span class="wmc-current-currency-code">
                        <?php echo esc_html( $display_current_currency ) ?>
                        <?php echo( $symbol ? ', ' . esc_html( get_woocommerce_currency_symbol( $current_currency ) ) : '' ); ?>
                    </span>
                   <?php echo wp_kses_post( $arrow ) ?>
				</span>
                <div class="wmc-sub-currency">
					<?php
					foreach ( $links as $k => $link ) {
						$sub_class = array( 'wmc-currency' );
						if ( $current_currency == $k ) {
							$sub_class[] = 'wmc-hidden';
						}

						/*End override*/
						$country          = $this->settings->get_country_data( $k );
						$display_currency = $country_name ? $country['name'] : $k;
						$display_currency = apply_filters( 'wmc_shortcode_custom_currency', $display_currency );
						?>
                        <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?> <?php echo esc_attr( $display_currency ) ?>">
							<?php
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" title="<?php echo esc_attr( $country['name'] ) ?>"
                               class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $k ) ?>">
                                <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                                   class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "> </i>
                                <span class="wmc-sub-currency-code"><?php echo wp_kses_post( $display_currency ) ?></span>
								<?php echo( $symbol ? ', ' . wp_kses_post( get_woocommerce_currency_symbol( $k ) ) : '' ); ?>
                            </a>
                        </div>
						<?php
					}
					?>
                </div>
            </div>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	/**
	 * Shortcode pain horizontal currencies
	 * @return string
	 */
	public function shortcode_layout6( $atts, $content = null ) {
		extract(
			shortcode_atts(
				array(
					'title' => '',
				), $atts
			)
		);
		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}
		$class = $this->get_position_option();

		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-horizontal layout6 <?php echo esc_attr( $class ) ?>"
             data-layout="layout6">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
			<?php
			foreach ( $links as $k => $link ) {
				if ( $current_currency ) {
					if ( $current_currency == $k ) {
						$class = "wmc-active";
					} else {
						$class = '';
					}
				}
				?>
                <div class="wmc-currency <?php echo esc_attr( $class ) ?>">
					<?php
					if ( $this->settings->enable_switch_currency_by_js() ) {
						$link = '#';
					}
					?>
                    <a rel="nofollow" class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                       data-currency="<?php echo esc_attr( $k ) ?>">
						<?php echo wp_kses_post( get_woocommerce_currency_symbol( $k ) ) ?>
                    </a>
                </div>
				<?php
			}
			?>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	/**
	 * Pain vertical currency symbols
	 *
	 * @param      $atts
	 * @param null $content
	 *
	 * @return string
	 */
	public function shortcode_layout7( $atts, $content = null ) {
		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'dropdown_icon' => 'arrow',
				), $atts
			)
		);
		ob_start();
		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}
		$current_currency = $this->settings->get_current_currency();
		$symbol           = get_woocommerce_currency_symbol( $current_currency );
		$links            = $this->settings->get_links();
		$class            = $this->get_position_option();
		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}
		$arrow = '';
		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode plain-vertical vertical-currency-symbols <?php echo esc_attr( $class ) ?>"
             data-layout="layout7" data-dropdown_icon="<?php echo esc_attr( $dropdown_icon ) ?>">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper">
				<span class="wmc-current-currency">
					<span class="wmc-current-currency-symbol"><?php echo esc_html( $symbol ) ?></span>
					<?php echo wp_kses_post( $arrow ) ?>
				</span>
                <div class="wmc-sub-currency">
					<?php
					foreach ( $links as $k => $link ) {
						$sub_class = array( 'wmc-currency' );
						if ( $current_currency == $k ) {
							$sub_class[] = 'wmc-hidden';
						}
						?>
                        <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>">
							<?php
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" class="wmc-currency-redirect" href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $k ) ?>">
								<?php echo wp_kses_post( get_woocommerce_currency_symbol( $k ) ); ?>
                            </a>
                        </div>
						<?php
					}
					?>
                </div>
            </div>
        </div>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	public function shortcode_layout8( $atts, $content = null ) {
		ob_start();
		$current_currency = $this->settings->get_current_currency();
		$symbol           = get_woocommerce_currency_symbol( $current_currency );
		$links            = $this->settings->get_links();
		$class            = $this->get_position_option();
		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}
		$fix_class = ctype_alpha( substr( $symbol, 0, 2 ) ) && strlen( $symbol ) >= 3 ? 'wmc-fix-font' : '';
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode vertical-currency-symbols-circle <?php echo esc_attr( $class ) ?>"
             data-layout="layout8">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper" onclick="">
				<span class="wmc-current-currency <?php echo esc_attr( $fix_class ) ?>">
					<?php echo esc_html( $symbol ) ?>
				</span>

                <div class="wmc-sub-currency">
					<?php
					foreach ( $links as $k => $link ) {
						$sub_class = array( 'wmc-currency' );
						if ( $current_currency == $k ) {
							$sub_class[] = 'wmc-hidden';
						}
						?>
                        <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>">
							<?php
							$symbol    = esc_html( get_woocommerce_currency_symbol( $k ) );
							$fix_class = ctype_alpha( substr( $symbol, 0, 2 ) ) && strlen( $symbol ) >= 3 ? 'wmc-fix-font' : '';
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" class="wmc-currency-redirect <?php echo esc_attr( $fix_class ) ?>"
                               href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $k ) ?>"><?php echo wp_kses_post( $symbol ); ?></a>
                        </div>
						<?php
					}
					?>
                </div>
            </div>
        </div>
		<?php

		return ob_get_clean();
	}

	public function shortcode_layout9( $atts, $content = null ) {
		$current_currency     = $this->settings->get_current_currency();
		$links                = $this->settings->get_links();
		$class                = $this->get_position_option();
		$current_currency_pos = array_search( $current_currency, array_keys( $links ), true );
		$left_arr             = array_slice( $links, 0, $current_currency_pos );
		$right_arr            = array_slice( $links, $current_currency_pos );
		ob_start();
		?>
        <div id="<?php echo esc_attr( self::get_shortcode_id() ) ?>"
             class="woocommerce-multi-currency wmc-shortcode layout9 <?php echo esc_attr( $class ) ?>"
             data-layout="layout9">
            <input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $this->current_url ) ?>">
            <div class="wmc-currency-wrapper">
				<?php
				if ( is_array( $left_arr ) && count( $left_arr ) ) {
					$i = 0;
					foreach ( $left_arr as $code => $link ) {
						$symbol = get_woocommerce_currency_symbol( $code );
						?>
                        <div class="wmc-currency wmc-left" style="z-index: <?php echo esc_attr( $i ++ ) ?>">
							<?php
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" class="wmc-currency-redirect"
                               href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $code ) ?>"><?php echo wp_kses_post( $symbol ); ?></a>
                        </div>
						<?php
					}
				}

				if ( is_array( $right_arr ) && $i = count( $right_arr ) ) {
					foreach ( $right_arr as $code => $link ) {
						$active           = $current_currency == $code ? 'wmc-active' : '';
						$z_index          = $current_currency == $code ? 999 : $i --;
						$align            = $current_currency == $code ? 'wmc-current-currency' : 'wmc-right';
						$symbol           = get_woocommerce_currency_symbol( $code );
						$current_currency = $current_currency == $code && $current_currency != $symbol ? $current_currency : '';
						?>
                        <div class="wmc-currency <?php echo esc_attr( $align ) . ' ' . esc_attr( $active ) ?>"
                             style="z-index: <?php echo esc_attr( $z_index ) ?>">
							<?php
							if ( $this->settings->enable_switch_currency_by_js() ) {
								$link = '#';
							}
							?>
                            <a rel="nofollow" class="wmc-currency-redirect"
                               href="<?php echo esc_attr( $link ) ?>"
                               data-currency="<?php echo esc_attr( $code ) ?>"><?php echo wp_kses_post( $current_currency ) . ' ' . wp_kses_post( $symbol ); ?></a>
                        </div>
						<?php
					}
				}
				?>
            </div>
        </div>
		<?php

		return ob_get_clean();
	}

	public function shortcode_layout10( $atts, $content = null ) {
		$this->enqueue_flag_css();
		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'flag_size'     => 0.4,
					'symbol'        => '',
					'dropdown_icon' => 'arrow',
					'custom_format' => '',
				), $atts
			)
		);


		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		ob_start();

		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}

		$data_flag_size = $flag_size;
		$class          = $this->get_position_option();

		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}

		$line_height = ( $flag_size * 40 ) . 'px';
		$arrow       = '';

		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies" style="height: ' . esc_attr( $line_height ) . '"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}

		$country_data = $this->settings->get_country_data( $current_currency );

		$args = [
			'id'               => self::get_shortcode_id(),
			'arrow'            => $arrow,
			'dropdown_icon'    => $dropdown_icon,
			'countries'        => get_woocommerce_currencies(),
			'flag_size'        => $this->fix_style( $flag_size ),
			'country_data'     => $country_data,
			'country_code'     => strtolower( $country_data['code'] ),
			'symbol'           => get_woocommerce_currency_symbol( $current_currency ),
			'current_url'      => $this->current_url,
			'links'            => $links,
			'data_flag_size'   => $data_flag_size,
			'class'            => $class,
			'custom_format'    => $custom_format,
			'current_currency' => $current_currency,
			'line_height'      => $line_height,
			'settings'         => $this->settings
		];

		wc_get_template( 'shortcode-layout10.php', $args, 'woocommerce-multi-currency', WOOMULTI_CURRENCY_TEMPLATES );

		return ob_get_clean();
	}

	public function shortcode_layout11( $atts, $content = null ) {
		$this->enqueue_flag_css();
		extract(
			shortcode_atts(
				array(
					'title'         => '',
					'flag_size'     => 0.4,
					'symbol'        => '',
					'dropdown_icon' => 'arrow',
					'custom_format' => '',
				), $atts
			)
		);


		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		ob_start();

		if ( $title ) {
			echo '<h3>' . esc_html( $title ) . '</h3>';
		}

		$data_flag_size = $flag_size;
		$class          = $this->get_position_option();

		if ( $this->settings->get_params( 'click_to_expand_currencies' ) ) {
			$class .= ' wmc-currency-trigger-click';
		}

		$line_height = ( $flag_size * 40 ) . 'px';
		$arrow       = '';

		switch ( $dropdown_icon ) {
			case 'arrow';
				$arrow = '<i class="wmc-open-dropdown-currencies" style="height: ' . esc_attr( $line_height ) . '"></i>';
				break;
			case 'triangle';
				$arrow = '<span class="wmc-current-currency-arrow"></span>';
				break;
			default:
		}

		$country_data = $this->settings->get_country_data( $current_currency );

		$args = [
			'id'               => self::get_shortcode_id(),
			'arrow'            => $arrow,
			'dropdown_icon'    => $dropdown_icon,
			'countries'        => get_woocommerce_currencies(),
			'flag_size'        => $this->fix_style( $flag_size ),
			'country_data'     => $country_data,
			'country_code'     => strtolower( $country_data['code'] ),
			'symbol'           => get_woocommerce_currency_symbol( $current_currency ),
			'current_url'      => $this->current_url,
			'links'            => $links,
			'data_flag_size'   => $data_flag_size,
			'class'            => $class,
			'custom_format'    => $custom_format,
			'current_currency' => $current_currency,
			'line_height'      => $line_height,
			'settings'         => $this->settings
		];

		wc_get_template( 'shortcode-layout11.php', $args, 'woocommerce-multi-currency', WOOMULTI_CURRENCY_TEMPLATES );

		return ob_get_clean();
	}

	public function shortcode_flatsome_mobile_menu( $atts, $content = null ) {
		$this->enqueue_flag_css();

		extract(
			shortcode_atts(
				array(
					'title'     => '',
					'flag_size' => 0.6,
					'symbol'    => ''
				), $atts
			)
		);

		$links            = $this->settings->get_links();
		$current_currency = $this->settings->get_current_currency();
		$country          = $this->settings->get_country_data( $current_currency );
		ob_start();

		?>
        <span class="wmc-flatsome-mobile-nav wmc-current-currency"
              style="line-height: <?php echo esc_attr( $flag_size * 40 ) ?>px">
                 <span>
                    <?php echo wp_kses_post( $current_currency ) ?>
                    <?php echo( $symbol ? ', ' . wp_kses_post( get_woocommerce_currency_symbol( $current_currency ) ) : '' ); ?>
                </span>
                <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                   class="vi-flag-64 flag-<?php echo esc_attr( strtolower( $country['code'] ) ) ?> "> </i>

        </span>

        <ul class="children">
			<?php
			foreach ( $links as $k => $link ) {
				if ( $current_currency == $k ) {
					continue;
				}

				$country = $this->settings->get_country_data( $k );
				?>
                <li class="wmc-currency">
					<?php
					if ( $this->settings->enable_switch_currency_by_js() ) {
						$link = '#';
					}
					?>
                    <a rel="nofollow" title="<?php echo esc_attr( $country['name'] ) ?>"
                       href="<?php echo esc_attr( $link ) ?>"
                       style="line-height: <?php echo esc_attr( $flag_size * 40 ) ?>px">
                    </a>
                    <span><?php echo wp_kses_post( $k ) ?></span>
                    <i style="<?php echo esc_attr( $this->fix_style( $flag_size ) ) ?>"
                       class="vi-flag-64 flag-<?php echo esc_html( strtolower( $country['code'] ) ) ?> "> </i>
					<?php echo( $symbol ? ', ' . wp_kses_post( get_woocommerce_currency_symbol( $k ) ) : '' ); ?>
                </li>
				<?php
			}
			?>
        </ul>
		<?php

		$html = ob_get_clean();

		return $html;
	}

	public function shortcode_custom_work_layout( $attr, $content = null ) {
		do_action( 'wmc_custom_work_layout', $attr, $content );
	}

	public function currency_convertor() {
		$list_currencies = $this->settings->get_list_currencies();
		$rates           = wp_list_pluck( $list_currencies, 'rate' );

		wp_enqueue_script( 'woocommerce-multi-currency-convertor' );
		wp_localize_script( 'woocommerce-multi-currency-convertor', 'wmcConvertorParams', [ 'rates' => $rates ] );

		$currencies       = $this->settings->get_currencies();
		$default          = $this->settings->get_default_currency();
		$current_currency = $this->settings->get_current_currency();
		$wc_currencies    = get_woocommerce_currencies();

		ob_start();
		?>
        <div class="wmc-currency-convertor">
            <h3><?php esc_html_e( 'Currency convertor', 'woocommerce-multi-currency' ); ?></h3>
            <div>
                <div class="wmc-convertor-row">
                    <div class="wmc-convertor-label">
						<?php esc_html_e( 'Amount', 'woocommerce-multi-currency' ); ?>
                    </div>
                    <div class="wmc-convertor-input">
                        <input type="number" min="0" value="1" class="wmc-currency-convertor-amount">
                    </div>
                </div>

                <div class="wmc-convertor-row">
                    <div class="wmc-convertor-label">
						<?php esc_html_e( 'From', 'woocommerce-multi-currency' ); ?>
                    </div>
                    <div class="wmc-convertor-input">
                        <select class="wmc-convertor-from-currency">
							<?php
							if ( ! empty( $currencies ) && is_array( $currencies ) ) {
								foreach ( $currencies as $currency ) {
									$selected      = $default == $currency ? 'selected' : '';
									$currency_name = ! empty( $wc_currencies[ $currency ] ) ? "{$currency} - {$wc_currencies[ $currency ]}" : $currency;
									printf( '<option value="%s" %s>%s</option>', esc_attr( $currency ), esc_attr( $selected ), esc_html( $currency_name ) );
								}
							}
							?>
                        </select>
                    </div>
                </div>

                <div class="wmc-convertor-row">
                    <div class="wmc-convertor-label">
						<?php esc_html_e( 'To', 'woocommerce-multi-currency' ); ?>
                    </div>
                    <div class="wmc-convertor-input">
                        <select class="wmc-convertor-to-currency">
							<?php
							if ( ! empty( $currencies ) && is_array( $currencies ) ) {
								foreach ( $currencies as $currency ) {
									$selected      = $current_currency == $currency ? 'selected' : '';
									$currency_name = ! empty( $wc_currencies[ $currency ] ) ? "{$currency} - {$wc_currencies[ $currency ]}" : $currency;
									printf( '<option value="%s" %s>%s</option>', esc_attr( $currency ), esc_attr( $selected ), esc_html( $currency_name ) );
								}
							}
							?>
                        </select>
                    </div>
                </div>

                <div class="wmc-convertor-row">
                    <div class="wmc-currency-convertor-result">
                    </div>
                </div>

            </div>
        </div>
		<?php
		return ob_get_clean();
	}

	public function product_price_collate( $atts ) {
		extract(
			shortcode_atts(
				array(
					'layout'        => '',
					'price_convert' => 0,
					'price_range'   => '',
					'currencies'    => 'all',
					'title'         => '',
					'class'         => '',
				), $atts
			)
		);

		if ( ! isset( $layout ) || ! isset( $currencies ) || ! isset( $title ) || ! isset( $class ) ||
		     ! isset( $price_range ) || ! isset( $price_convert ) || empty( $price_convert ) ) {
			return '';
		}

		wp_enqueue_style( 'woocommerce-multi-currency-collate' );

		$list_currencies  = $this->settings->get_list_currencies();
		$rates            = wp_list_pluck( $list_currencies, 'rate' );
		$st_currencies    = $this->settings->get_currencies();
		$default          = $this->settings->get_default_currency();
		$current_currency = $this->settings->get_current_currency();
		$dp_currencies    = [];
		if ( $currencies == 'all' ) {
			$dp_currencies = array_diff( $st_currencies, [ $current_currency ] );
		} else {
			$currencies    = explode( ',', $currencies );
			$dp_currencies = array_diff( $currencies, [ $current_currency ] );
		}
		$price_range = explode( '|', $price_range );
		$price_range = count( $price_range ) == 2 ? $price_range : '';

		ob_start();

		$args = [
			'layout'           => $layout,
			'currencies'       => $dp_currencies,
			'st_currencies'    => $st_currencies,
			'current_currency' => $current_currency,
			'price_convert'    => $price_convert,
			'price_range'      => $price_range,
			'rates'            => $rates,
			'title'            => $title,
			'class'            => $class,
			'current_url'      => $this->current_url,
		];
//        echo '<pre>' . print_r($args, true) . '</pre>';
		wc_get_template( 'shortcode-collate.php', $args, 'woocommerce-multi-currency', WOOMULTI_CURRENCY_TEMPLATES );

		return ob_get_clean();
	}

	public function single_product_price_collate() {
		if ( is_product() ) {
			global $product;
			if ( ! isset( $product ) || empty( $product ) ) {
				return;
			}
			$product_price = $product->get_price();
			echo do_shortcode( '[woo_multi_currency_product_collate layout="' . esc_attr( $this->settings->get_param('price_collate_layout') ) .
			                   '" price_convert=' . esc_attr( $product_price ) . ' title="' . $this->settings->get_param( 'price_collate_title' ) . '"]' );
		}
    }
}