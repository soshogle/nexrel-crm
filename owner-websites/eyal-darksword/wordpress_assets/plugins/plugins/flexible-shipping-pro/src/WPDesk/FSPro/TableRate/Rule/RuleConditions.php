<?php
/**
 * Class RuleConditions
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\Rule;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\Condition\Price;
use WPDesk\FSPro\TableRate\Rule\Condition\DimensionalWeight;
use WPDesk\FSPro\TableRate\Rule\Condition\PricePro;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\CategoriesOptions;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductDimensionHeight;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductDimensionLength;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductDimensionWidth;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass\AdditionalOptionsDetector;
use WPDesk\FSPro\TableRate\Rule\Condition\WeightPro;

/**
 * Can provide rule conditions.
 */
class RuleConditions implements Hookable {

	/**
	 * @var CategoriesOptions
	 */
	private $categories_options;

	/**
	 * RuleConditions constructor.
	 *
	 * @param CategoriesOptions $categories_options .
	 */
	public function __construct( CategoriesOptions $categories_options ) {
		$this->categories_options = $categories_options;
	}

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_rule_conditions', [ $this, 'add_rule_conditions' ] );
	}

	/**
	 * @param AbstractCondition[] $conditions .
	 *
	 * @return AbstractCondition[]
	 */
	public function add_rule_conditions( $conditions ) {
		$categories_options = new CategoriesOptions();
		( new Condition\ProductCategory\AjaxHandler( $categories_options ) )->hooks();

		$item                     = new Condition\Item( 15 );
		$volume                   = new Condition\Volume( 35 );
		$product                  = new Condition\Product( 30 );
		$product_tag              = new Condition\ProductTag( 45 );
		$product_category         = new Condition\ProductCategory( $categories_options, 50 );
		$time_of_day              = new Condition\TimeOfTheDay( 70 );
		$max_dimension            = new Condition\MaxDimension( 40 );
		$product_length           = new ProductDimensionLength( 41 );
		$product_width            = new ProductDimensionWidth( 42 );
		$product_height           = new ProductDimensionHeight( 43 );
		$cart_line_item           = new Condition\CartLineItem( 20 );
		$shipping_class           = new Condition\ShippingClass( $this->get_shipping_classes(), new AdditionalOptionsDetector( $_GET ), 60 );
		$day_of_the_week          = new Condition\DayOfTheWeek( 75 );
		$total_overall_dimensions = new Condition\TotalOverallDimensions( 40 );
		$user_role                = new Condition\UserRole( 40 );

		$conditions[ $item->get_condition_id() ]                     = $item;
		$conditions[ $product->get_condition_id() ]                  = $product;
		$conditions[ $product_tag->get_condition_id() ]              = $product_tag;
		$conditions[ $product_category->get_condition_id() ]         = $product_category;
		$conditions[ $volume->get_condition_id() ]                   = $volume;
		$conditions[ $time_of_day->get_condition_id() ]              = $time_of_day;
		$conditions[ $max_dimension->get_condition_id() ]            = $max_dimension;
		$conditions[ $product_length->get_condition_id() ]           = $product_length;
		$conditions[ $product_width->get_condition_id() ]            = $product_width;
		$conditions[ $product_height->get_condition_id() ]           = $product_height;
		$conditions[ $cart_line_item->get_condition_id() ]           = $cart_line_item;
		$conditions[ $shipping_class->get_condition_id() ]           = $shipping_class;
		$conditions[ $day_of_the_week->get_condition_id() ]          = $day_of_the_week;
		$conditions[ $total_overall_dimensions->get_condition_id() ] = $total_overall_dimensions;
		$conditions[ $user_role->get_condition_id() ]                = $user_role;

		$price_pro  = new PricePro( 10 );
		$weight_pro = new WeightPro( 25 );

		$conditions[ $price_pro->get_condition_id() ]  = $price_pro;
		$conditions[ $weight_pro->get_condition_id() ] = $weight_pro;

		// Dimensional Weight.
		$dimensional_weight = new DimensionalWeight( 30 );

		$conditions[ $dimensional_weight->get_condition_id() ] = $dimensional_weight;

		return $conditions;
	}

	/**
	 * @return array
	 */
	private function get_shipping_classes() {
		$shipping_classes_terms = WC()->shipping()->get_shipping_classes();
		$shipping_classes       = [];
		foreach ( $shipping_classes_terms as $shipping_class ) {
			$shipping_classes[ $shipping_class->term_id ] = $shipping_class->name;
		}

		return $shipping_classes;
	}
}
