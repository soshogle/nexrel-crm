<?php
/**
 * ProductTagImportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractImportData;
use WPDesk\FS\TableRate\ImportExport\Exception\InvalidImportDataException;
use WPDesk\FSPro\TableRate\Rule\Condition\Product;

/**
 * Class Hooks
 */
class ProductImportData extends AbstractImportData {

	/**
	 * @var string
	 */
	protected $condition_id = Product::CONDITION_ID;

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 * @param array  $mapped     .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name, $mapped = array() ) {
		if ( $this->condition_id !== $field_name ) {
			return $value;
		}

		return explode( ',', $value );
	}

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 *
	 * @return void
	 * @throws InvalidImportDataException .
	 */
	public function verify_data( $value, $field_name ) {
		if ( $field_name === $this->condition_id ) {
			$products = explode( ',', $value );

			foreach ( $products as $product_id ) {
				$product = wc_get_product( $product_id );
				if ( ! $product ) {
					// Translators: product id.
					throw new InvalidImportDataException( sprintf( __( 'Product with ID #%1$s does not exist.', 'flexible-shipping-pro' ), $product_id ) );
				}
			}
		}
	}
}
