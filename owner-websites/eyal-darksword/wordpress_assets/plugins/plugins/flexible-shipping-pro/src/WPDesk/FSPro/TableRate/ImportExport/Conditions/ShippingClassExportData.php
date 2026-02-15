<?php
/**
 * ExportDataShippingClass.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WP_Term;
use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractExportData;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Class Hooks
 */
class ShippingClassExportData extends AbstractExportData {
	/**
	 * @var string
	 */
	protected $condition_id = ShippingClass::CONDITION_ID;

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name ) {
		if ( ShippingClass::CONDITION_ID !== $field_name ) {
			return $value;
		}

		$new_value = array();

		foreach ( $value as $shipping_class_id ) {
			if ( ! in_array( $shipping_class_id, ShippingClass::PREDEFINED_VALUES, true ) ) {
				$shipping_class_id = $this->get_shipping_class_name_by_id( (int) $shipping_class_id );
			}

			if ( $shipping_class_id ) {
				$new_value[] = str_replace( ',', '\,', $shipping_class_id );
			}
		}

		return $new_value;
	}

	/**
	 * @param int $shipping_class_id .
	 *
	 * @return false|string
	 */
	private function get_shipping_class_name_by_id( $shipping_class_id ) {
		$shipping_class = get_term_by( 'id', $shipping_class_id, 'product_shipping_class' );

		if ( $shipping_class instanceof WP_Term ) {
			return $shipping_class->name;
		}

		return false;
	}
}
