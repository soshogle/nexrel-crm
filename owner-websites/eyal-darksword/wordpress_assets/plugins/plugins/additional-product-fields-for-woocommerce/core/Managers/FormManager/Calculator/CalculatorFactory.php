<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;




use Exception;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\DistanceCalculator;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\FormulaCalculator;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\GroupOfFieldsInGroupCalculator;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\PricePerDayCalculator;
use rednaowooextraproduct\pr\Managers\FormManager\Calculator\TBPricePerItemCalculator;

class CalculatorFactory
{
    /**
     * @param $field FBFieldBase
     * @return
     */
    public static function GetCalculator($field)
    {
        switch ($field->Options->PriceType)
        {
            case 'fixed_amount':
            case 'product_price':
                return new FixedAmountCalculator($field);
            case 'current_value':
                return new CurrentValueCalculator($field);
            case 'quantity':
                return new QuantityCalculator($field);
            case 'percent_of_original_price':
                return new PercentOfOriginalPriceCalculator($field);
            case 'percent_or_original_price_plus_options':
                return new PercentOfOriginalPricePlusOptionsCalculator($field);
            case 'price_per_char':
                return new PricePerCharCalculator($field);
            case 'price_per_word':
                return new PricePerWordCalculator($field);
            case 'none':
            case 'survey_options':
                return new NoneCalculator($field);
            case 'options':
            case 'subproductprice':
                return new OptionsCalculator($field);
            case 'price_per_item':
                return new PricePerItemCalculator($field);
            case 'sum_of_fields_in_group':
                return new GroupOfFieldsInGroupCalculator($field);
            case 'price_per_day':
                return new PricePerDayCalculator($field);
            case 'formula':
                $formula= \apply_filters('rednaowooextraproduct_get_formula_calculator',null,$field);
                if($formula==null)
                    return new NoneCalculator($field);
                return $formula;
            case 'global_quantity':
                return new GlobalCalculator($field);
            case 'tb_price_per_item':
                try
                {
                    return new TBPricePerItemCalculator($field);
                }catch (Exception $e)
                {
                    throw new Exception('Price per item calculator is not available in the free version');
                }
            case 'distance':
                try
                {
                    return new DistanceCalculator($field);
                }catch (Exception $e)
                {
                    throw new Exception('Distance calculator is not available in the free version');
                }

            case 'price_per_row':
                return new PricePerRowCalculator($field);
            case 'product_quantity':
                return new ProductQuantityCalculator($field);
            case 'GroupPanel':
            case 'price_per_range':
            case 'formula_item':
                return new NoneCalculator($field);
        }


        throw new Exception('Undefined calculator'.$field->Options->PriceType);
    }
}