<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use Exception;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBMultipleOptionsField;
use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;
use rednaowooextraproduct\pr\Managers\FormManager\Fields\FBSizeChartField;

class PricePerRowCalculator extends CalculatorBase
{
    /** @var FBSizeChartField */
    public $Field;
    public $IsValid;
    public function ExecutedCalculation($value)
    {
        $options=$this->Field->GetSelectedOptions();

        $price=0;
        $quantity=0;
        $salePrice=0;
        foreach($options as $currentOption)
        {
            $price+=$currentOption->Price;
            $salePrice+=$currentOption->SalePrice;
            $quantity=$currentOption->Quantity;
        }
        return $this->CreateCalculationObject($price,$salePrice,$quantity);


    }





}