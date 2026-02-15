<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Motopress_hotel_booking
 * WordPress Hotel Booking
 * Author MotoPress
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Motopress_hotel_booking {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() && is_plugin_active( 'motopress-hotel-booking/motopress-hotel-booking.php' ) ) {
//			add_filter( 'mphb_tmpl_the_room_type_price_for_dates', array( $this, 'mphb_tmpl_the_room_type_price_for_dates' ), 10, 4 );
//			add_filter( 'mphb_booking_price_breakdown', array( $this, 'mphb_booking_price_breakdown' ), 10, 2 );
			add_filter( 'mphb_format_price_parameters', array( $this, 'mphb_format_price_parameters' ), 10, 2 );
		}
	}

	public function mphb_tmpl_the_room_type_price_for_dates( $format_price, $taxesAndFees, $priceFortmatAtts, $defaultPriceForNights ) {
		$defaultPrice_currency = wmc_get_price( $defaultPriceForNights );

		$format_price_currency = mphb_format_price( $defaultPrice_currency, $priceFortmatAtts );

		return $format_price_currency;
	}

	public function mphb_booking_price_breakdown( $priceBreakdown, $mphb_booking ) {
		if ( ! $priceBreakdown || ! is_array( $priceBreakdown ) ) {
			return $priceBreakdown;
		}
		if ( isset( $priceBreakdown['total'] ) ) {
			$priceBreakdown['total'] = wmc_get_price( $priceBreakdown['total'] );
		}

		if ( ! isset( $priceBreakdown['rooms'] ) || ! is_array( $priceBreakdown['rooms'] ) ) {
			return $priceBreakdown;
		}
		foreach ( $priceBreakdown['rooms'] as $rs_key => $rs_val ) {
			if ( isset( $rs_val['total'] ) ) {
				$priceBreakdown['rooms'][$rs_key]['total'] = wmc_get_price( $rs_val['total'] );
			}
			if ( isset( $rs_val['discount_total'] ) ) {
				$priceBreakdown['rooms'][$rs_key]['discount_total'] = wmc_get_price( $rs_val['discount_total'] );
			}
			if ( is_array( $rs_val ) && ! empty( $rs_val ) ) {
				foreach ( $rs_val as $r_array_key => $r_array_val ) {
					if ( isset( $r_array_val['total'] ) ) {
						$priceBreakdown['rooms'][$rs_key][$r_array_key]['total'] = wmc_get_price( $r_array_val['total'] );
					}
					if ( isset( $r_array_val['discount'] ) ) {
						$priceBreakdown['rooms'][$rs_key][$r_array_key]['discount'] = wmc_get_price( $r_array_val['discount'] );
					}
					if ( isset( $r_array_val['discount_total'] ) ) {
						$priceBreakdown['rooms'][$rs_key][$r_array_key]['discount_total'] = wmc_get_price( $r_array_val['discount_total'] );
					}
					if ( isset( $r_array_val['list'] ) && ! empty( $r_array_val['list'] ) ) {
						foreach ( $r_array_val['list'] as $r_array_l_key => $r_array_l_val ) {
							if ( is_numeric( $r_array_l_val ) ) {
								$priceBreakdown['rooms'][$rs_key][$r_array_key]['list'][$r_array_l_key] = wmc_get_price( $r_array_l_val );
							}
						}
					}
					if ( isset( $r_array_val['room'] ) && ! empty( $r_array_val['room'] ) ) {
						foreach ( $r_array_val['room'] as $r_array_r_key => $r_array_r_val ) {
							if ( isset( $r_array_r_val['total'] ) ) {
								$priceBreakdown['rooms'][$rs_key][$r_array_key]['room']['total'] = wmc_get_price( $r_array_r_val['total'] );
							}
							if ( isset( $r_array_r_val['list'] ) && ! empty( $r_array_r_val['list'] ) && is_array( $r_array_r_val['list'] ) ) {
								foreach ( $r_array_r_val['list'] as $r_array_r_l_key => $r_array_r_l_val ) {
									if ( is_numeric( $r_array_r_l_val ) ) {
										$priceBreakdown['rooms'][$rs_key][$r_array_key]['room']['list'][$r_array_r_l_key] = wmc_get_price( $r_array_r_l_val );
									}
								}
							}
						}
					}
					if ( isset( $r_array_val['services'] ) && ! empty( $r_array_val['services'] ) ) {
						foreach ( $r_array_val['services'] as $r_array_r_key => $r_array_r_val ) {
							if ( isset( $r_array_r_val['total'] ) ) {
								$priceBreakdown['rooms'][$rs_key][$r_array_key]['services']['total'] = wmc_get_price( $r_array_r_val['total'] );
							}
							if ( isset( $r_array_r_val['list'] ) && ! empty( $r_array_r_val['list'] ) && is_array( $r_array_r_val['list'] ) ) {
								foreach ( $r_array_r_val['list'] as $r_array_r_l_key => $r_array_r_l_val ) {
									if ( is_numeric( $r_array_r_l_val ) ) {
										$priceBreakdown['rooms'][$rs_key][$r_array_key]['services']['list'][$r_array_r_l_key] = wmc_get_price( $r_array_r_l_val );
									}
								}
							}
						}
					}
					if ( isset( $r_array_val['fees'] ) && ! empty( $r_array_val['fees'] ) ) {
						foreach ( $r_array_val['fees'] as $r_array_r_key => $r_array_r_val ) {
							if ( isset( $r_array_r_val['total'] ) ) {
								$priceBreakdown['rooms'][$rs_key][$r_array_key]['fees']['total'] = wmc_get_price( $r_array_r_val['total'] );
							}
							if ( isset( $r_array_r_val['list'] ) && ! empty( $r_array_r_val['list'] ) && is_array( $r_array_r_val['list'] ) ) {
								foreach ( $r_array_r_val['list'] as $r_array_r_l_key => $r_array_r_l_val ) {
									if ( is_numeric( $r_array_r_l_val ) ) {
										$priceBreakdown['rooms'][$rs_key][$r_array_key]['fees']['list'][$r_array_r_l_key] = wmc_get_price( $r_array_r_l_val );
									}
								}
							}
						}
					}
				}
			}
		}

		return $priceBreakdown;
	}

	public function mphb_format_price_parameters( $price_attrs ) {
		if ( isset( $price_attrs['attributes'] ) && is_array( $price_attrs['attributes'] ) && isset( $price_attrs['attributes']['currency_symbol'] ) ) {
			$price_attrs['attributes']['currency_symbol'] = get_woocommerce_currency_symbol();
		}
		if ( isset( $price_attrs['price'] ) && ! empty( $price_attrs['price'] ) ) {
			$price_attrs['price'] = wmc_get_price( $price_attrs['price'] );
		}

		return $price_attrs;
	}

}