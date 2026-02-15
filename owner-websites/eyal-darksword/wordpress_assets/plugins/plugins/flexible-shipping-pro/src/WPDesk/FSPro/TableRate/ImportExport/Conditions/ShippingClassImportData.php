<?php
/**
 * ExportDataShippingClass.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WP_Term;
use WPDesk\FS\TableRate\ImporterExporter\Importer\Exception\ImportCSVException;
use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractExportData;
use WPDesk\FS\TableRate\ImportExport\Conditions\AbstractImportData;
use WPDesk\FS\TableRate\ImportExport\Conditions\Exception\UnableCreateElementException;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Class Hooks
 */
class ShippingClassImportData extends AbstractImportData {

	/**
	 * @var string
	 */
	protected $condition_id = ShippingClass::CONDITION_ID;

	/**
	 * @var WP_Term[]
	 */
	private $shipping_classes = array();

	/**
	 * @param mixed  $value      .
	 * @param string $field_name .
	 * @param array  $mapped     .
	 *
	 * @return mixed
	 */
	public function prepare_data( $value, $field_name, $mapped = array() ) {
		if ( ShippingClass::CONDITION_ID === $field_name ) {
			$value                = str_replace( '\,', '%2C', $value );
			$shipping_class_names = array_map(
				function ( $shipping_class_name ) {
					return str_replace( '%2C', ',', $shipping_class_name );
				},
				explode( ',', $value )
			);

			return $this->populate_shipping_classes( $shipping_class_names );
		}

		return $value;
	}

	/**
	 * @param string[] $shipping_class_names .
	 *
	 * @return array
	 */
	private function populate_shipping_classes( array $shipping_class_names ) {
		$shipping_classes = array();

		foreach ( $shipping_class_names as $shipping_class_name ) {
			if ( ! in_array(
				$shipping_class_name,
				ShippingClass::PREDEFINED_VALUES,
				true
			) ) {
				$term_id = $this->find_shipping_class_by_name( $shipping_class_name );
				if ( null === $term_id ) {
					$term_id = $this->create_shipping_class( $shipping_class_name, $shipping_class_name );
				}
				$shipping_classes[] = $term_id;
			} else {
				$shipping_classes[] = $shipping_class_name;
			}
		}
		return $shipping_classes;
	}

	/**
	 * Find and returns shipping class term id
	 *
	 * @param string $name Shipping class name to search.
	 *
	 * @return int|null Term id
	 */
	public function find_shipping_class_by_name( $name ) {
		foreach ( $this->get_shipping_classes() as $shipping_class ) {
			if ( $shipping_class->name === $name ) {
				return $shipping_class->term_id;
			}
		}

		return null;
	}

	/**
	 * Creates a shipping class
	 *
	 * @param string $name        Shipping class name.
	 * @param string $description Shipping class description.
	 *
	 * @return int Term id
	 * @throws UnableCreateElementException When can't create the class.
	 */
	public function create_shipping_class( $name, $description ) {
		$term_id = wp_insert_term( $name, 'product_shipping_class', array( 'description' => $description ) );
		if ( is_wp_error( $term_id ) ) {
			throw new UnableCreateElementException(
				sprintf(
					// Translators: rule shipping class and wp_error message.
					__( 'Error while creating shipping class: %1$s, %2$s', 'flexible-shipping-pro' ),
					$name,
					$term_id->get_error_message()
				)
			);
		}
		$term_id = (int) $term_id['term_id'];
		$this->add_shipping_class( get_term( $term_id ) );

		return $term_id;
	}

	/**
	 * @return WP_Term[]
	 */
	private function get_shipping_classes() {
		if ( empty( $this->shipping_classes ) ) {
			$this->shipping_classes = WC()->shipping()->get_shipping_classes();
		}

		return $this->shipping_classes;
	}

	/**
	 * @param WP_Term $term .
	 */
	private function add_shipping_class( WP_Term $term ) {
		$this->shipping_classes[] = $term;
	}

}
