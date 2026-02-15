<?php
/**
 * Class AbstractShippingClassContentsFilter
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

use WPDesk\FS\TableRate\Rule\ContentsFilter;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Abstract Shipping Class Contents Filter.
 */
abstract class AbstractShippingClassContentsFilter implements ContentsFilter {

	/**
	 * @var array
	 */
	protected $shipping_classes;

	/**
	 * @var array
	 */
	protected $present_shipping_classes = array();

	/**
	 * ShippingClassContentsFilter constructor.
	 *
	 * @param array $shipping_classes .
	 */
	public function __construct( array $shipping_classes ) {
		$this->shipping_classes = array_map( 'strval', $shipping_classes );
	}


	/**
	 * Returns filtered contents.
	 *
	 * @param array $contents .
	 *
	 * @return array
	 */
	abstract public function get_filtered_contents( array $contents );

	/**
	 * @param array $item .
	 *
	 * @return \WC_Product
	 */
	protected function get_product_from_item( array $item ) {
		return $item['data'];
	}

	/**
	 * @param \WC_Product $product .
	 *
	 * @return bool
	 */
	protected function should_be_item_removed( $product ) {
		if ( in_array( ShippingClass::ALL_PRODUCTS, $this->shipping_classes, true ) ) {
			$this->present_shipping_classes[ ShippingClass::ALL_PRODUCTS ] = 1;
			return false;
		}

		$shipping_class_id = (string) $this->convert_shipping_class_id_for_wpml( $product->get_shipping_class_id() );
		if ( $shipping_class_id ) {
			if ( in_array( ShippingClass::ANY_CLASS, $this->shipping_classes, true ) || in_array( $shipping_class_id, $this->shipping_classes, true ) ) {
				$this->present_shipping_classes[ ShippingClass::ANY_CLASS ] = 1;
				$this->present_shipping_classes[ $shipping_class_id ]       = 1;

				return false;
			}
		} else {
			if ( in_array( ShippingClass::NONE, $this->shipping_classes, true ) ) {
				$this->present_shipping_classes[ ShippingClass::NONE ] = 1;

				return false;
			}
		}

		return true;
	}

	/**
	 * Maybe convert shipping class id (WPML).
	 *
	 * @param string $shipping_class_id .
	 *
	 * @return mixed
	 *
	 * @codeCoverageIgnore
	 */
	protected function convert_shipping_class_id_for_wpml( $shipping_class_id ) {
		if ( $shipping_class_id && function_exists( 'icl_object_id' ) ) {
			global $sitepress;
			if ( ! empty( $sitepress ) ) {
				$default_language  = $sitepress->get_default_language();
				$shipping_class_id = icl_object_id( $shipping_class_id, 'product_shipping_class', false, $default_language );
			}
		}

		return $shipping_class_id;
	}

}
