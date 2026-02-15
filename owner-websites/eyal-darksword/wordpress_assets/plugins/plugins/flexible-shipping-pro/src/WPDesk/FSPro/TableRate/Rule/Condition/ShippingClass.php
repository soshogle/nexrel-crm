<?php
/**
 * Class ShippingClass
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSVendor\WPDesk\Forms\Field\SelectField;
use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass\AdditionalOptionsDetector;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass\ShippingClassContentsFilterAll;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass\ShippingClassContentsFilterAny;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass\ShippingClassContentsFilterNone;

/**
 * Shipping Class Condition.
 */
class ShippingClass extends AbstractCondition {

	use ConditionOperators;

	const ALL_PRODUCTS = 'all';
	const ANY_CLASS = 'any';
	const NONE = 'none';

	const PREDEFINED_VALUES = [
		self::ALL_PRODUCTS,
		self::ANY_CLASS,
		self::NONE,
	];

	const CONDITION_ID = 'shipping_class';

	const OPERATOR_ALL = 'all';
	const OPERATOR = 'operator';

	/**
	 * @var array
	 */
	private $all_shipping_classes;

	/**
	 * @var AdditionalOptionsDetector
	 */
	private $shipping_class_additional_options_detector;

	/**
	 * ShippingClass constructor.
	 *
	 * @param array                     $all_shipping_classes .
	 * @param AdditionalOptionsDetector $shipping_class_additional_options_detector .
	 * @param int                       $priority .
	 */
	public function __construct( array $all_shipping_classes, AdditionalOptionsDetector $shipping_class_additional_options_detector, $priority = 10 ) {
		$this->condition_id                               = self::CONDITION_ID;
		$this->name                                       = __( 'Shipping class', 'flexible-shipping-pro' );
		$this->description                                = __( 'Shipping cost based on the selected shipping class', 'flexible-shipping-pro' );
		$this->group                                      = __( 'Product', 'flexible-shipping-pro' );
		$this->all_shipping_classes                       = $all_shipping_classes;
		$this->priority                                   = $priority;
		$this->shipping_class_additional_options_detector = $shipping_class_additional_options_detector;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$condition_matched = 0 !== count( $contents->get_contents() );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $this->format_input_data_for_logger( $contents->get_contents() ) ) );

		return $condition_matched;
	}

	/**
	 * @param array $contents .
	 *
	 * @return string
	 */
	private function format_input_data_for_logger( array $contents ) {
		$format_input_data = '';

		foreach ( $this->get_shipping_classes_from_contents( $contents ) as $shipping_class ) {
			$format_input_data .= $shipping_class . ', ';
		}

		return trim( $format_input_data, ', ' );
	}

	/**
	 * @param array $contents .
	 *
	 * @return array
	 */
	private function get_shipping_classes_from_contents( array $contents ) {
		$contents_shipping_classes = [];
		foreach ( $contents as $contents_item ) {
			$product        = $this->get_product_from_contents_item( $contents_item );
			$shipping_class = $product->get_shipping_class_id();
			if ( 0 === $shipping_class ) {
				$contents_shipping_classes[ self::NONE ] = __( 'None', 'flexible-shipping-pro' );
			} elseif ( ! isset( $contents_shipping_classes[ $shipping_class ] ) ) {
				$contents_shipping_classes[ $shipping_class ] = $this->all_shipping_classes[ $shipping_class ];
			}
		}

		return $contents_shipping_classes;
	}

	/**
	 * @param array $contents_item .
	 *
	 * @return \WC_Product
	 */
	private function get_product_from_contents_item( array $contents_item ) {
		return $contents_item['data'];
	}

	/**
	 * @param array  $condition_settings .
	 * @param bool   $condition_matched  .
	 * @param string $input_data         .
	 *
	 * @return string
	 */
	protected function format_for_log( array $condition_settings, $condition_matched, $input_data ) {
		// Translators: condition name.
		$formatted_for_log = '   ' . sprintf( __( 'Condition: %1$s;', 'flexible-shipping-pro' ), $this->get_name() );

		// Translators: operator.
		$formatted_for_log .= sprintf( __( ' operator: %1$s;', 'flexible-shipping-pro' ), $this->get_operator_label( $this->get_operator_from_settings( $condition_settings, 'all' ) ) );

		$shipping_classes = isset( $condition_settings[ self::CONDITION_ID ] ) ? $condition_settings[ self::CONDITION_ID ] : [];
		$shipping_classes = is_array( $shipping_classes ) ? $shipping_classes : [ $shipping_classes ];

		$formatted_shipping_classes = '';
		foreach ( $shipping_classes as $shipping_class ) {
			if ( in_array( $shipping_class, self::PREDEFINED_VALUES, true ) ) {
				$formatted_shipping_classes .= $shipping_class . ', ';
			} else {
				if ( isset( $this->all_shipping_classes[ (string) $shipping_class ] ) ) {
					$formatted_shipping_classes .= $this->all_shipping_classes[ (string) $shipping_class ] . ', ';
				}
			}
		}
		$formatted_shipping_classes = trim( $formatted_shipping_classes, ', ' );

		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' shipping classes: %1$s;', 'flexible-shipping-pro' ), $formatted_shipping_classes );
		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' input data: %1$s;', 'flexible-shipping-pro' ), $input_data );
		// Translators: matched condition.
		$formatted_for_log .= sprintf( __( ' matched: %1$s', 'flexible-shipping-pro' ), ( $condition_matched ) ? __( 'yes', 'flexible-shipping-pro' ) : __( 'no', 'flexible-shipping-pro' ) );

		return $formatted_for_log;
	}

	/**
	 * @param string $operator .
	 *
	 * @return string
	 */
	private function get_operator_label( $operator ) {
		$labels = [
			'any'  => _x( 'matches any', 'shipping-class', 'flexible-shipping-pro' ),
			'all'  => _x( 'matches all', 'shipping-class', 'flexible-shipping-pro' ),
			'none' => _x( 'matches none', 'shipping-class', 'flexible-shipping-pro' ),
		];

		return isset( $labels[ $operator ] ) ? $labels[ $operator ] : $operator;
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return [
			$this->prepare_operator_matches( self::OPERATOR_ALL ),
			( new Field\WooSelect() )
				->set_name( self::CONDITION_ID )
				->set_multiple()
				->add_class( 'shipping-class' )
				->set_options( $this->get_shipping_classes_options() )
				->set_placeholder( __( 'search shipping class', 'flexible-shipping-pro' ) )
				->set_label( _x( 'of', 'select', 'flexible-shipping-pro' ) ),
		];
	}

	/**
	 * @param string|null $default_value .
	 *
	 * @return SelectField
	 */
	private function prepare_operator_matches( $default_value = null ) {
		$operator_matches = ( new SelectField() )
			->set_name( $this->get_operator_field_name() )
			->set_options(
				[
					[
						'value'       => 'any',
						'label'       => _x( 'any', 'shipping-class', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product with selected shipping classes in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'all',
						'label'       => _x( 'all', 'shipping-class', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product from each of selected shipping classes in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'none',
						'label'       => _x( 'none', 'shipping-class', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used only if there are no products with selected shipping classes in the cart', 'flexible-shipping-pro' ),
					],
				]
			)
			->set_label( _x( 'matches', 'shipping-class', 'flexible-shipping-pro' ) );
		if ( $default_value ) {
			$operator_matches->set_default_value( $default_value );
		}

		return $operator_matches;
	}


	/**
	 * @return array
	 */
	private function get_shipping_classes_options() {
		$shipping_classes = [];

		if ( $this->should_add_additional_options() ) {
			$shipping_classes[] = $this->prepare_option( self::ALL_PRODUCTS, __( 'All products', 'flexible-shipping-pro' ) );
			$shipping_classes[] = $this->prepare_option( self::ANY_CLASS, __( 'Any class (must be set)', 'flexible-shipping-pro' ) );
		}

		$shipping_classes[] = $this->prepare_option( self::NONE, __( 'Products without shipping class', 'flexible-shipping-pro' ) );

		$wc_shipping_classes = WC()->shipping->get_shipping_classes();

		foreach ( $wc_shipping_classes as $shipping_class ) {
			$shipping_classes[] = $this->prepare_option( $shipping_class->term_id, $shipping_class->name );
		}

		return $shipping_classes;
	}

	/**
	 * @return bool
	 */
	private function should_add_additional_options() {
		return $this->shipping_class_additional_options_detector->should_add_additional_options();
	}

	/**
	 * @param string $value .
	 * @param string $label .
	 *
	 * @return array
	 */
	private function prepare_option( $value, $label ) {
		return [
			'value' => $value,
			'label' => $label,
		];
	}

	/**
	 * @param ShippingContents $shipping_contents  .
	 * @param array            $condition_settings .
	 *
	 * @return ShippingContents
	 */
	public function process_shipping_contents( ShippingContents $shipping_contents, array $condition_settings ) {
		if ( isset( $condition_settings[ self::CONDITION_ID ] ) ) {
			$shipping_classes = is_array( $condition_settings[ self::CONDITION_ID ] ) ? $condition_settings[ self::CONDITION_ID ] : [ $condition_settings[ self::CONDITION_ID ] ];
			if ( ! empty( $shipping_classes ) ) {
				$operator = $this->get_operator_from_settings( $condition_settings, 'all' );
				if ( 'any' === $operator ) {
					$shipping_contents->filter_contents( new ShippingClassContentsFilterAny( $shipping_classes ) );
				} elseif ( 'none' === $operator ) {
					$shipping_contents->filter_contents( new ShippingClassContentsFilterNone( $shipping_classes ) );
				} else {
					$shipping_contents->filter_contents( new ShippingClassContentsFilterAll( $shipping_classes ) );
				}
			}
		}

		return $shipping_contents;
	}

	/**
	 * @param array $condition_settings .
	 *
	 * @return array
	 */
	public function prepare_settings( $condition_settings ) {
		$condition_settings[ self::OPERATOR ] = isset( $condition_settings[ self::OPERATOR ] ) ? $condition_settings[ self::OPERATOR ] : self::OPERATOR_ALL;

		return $condition_settings;
	}

}
