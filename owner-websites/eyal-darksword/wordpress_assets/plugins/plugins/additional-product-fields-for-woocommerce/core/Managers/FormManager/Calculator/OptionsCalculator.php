<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use Exception;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBMultipleOptionsField;
use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;

class OptionsCalculator extends CalculatorBase
{
    /** @var FBMultipleOptionsField */
    public $Field;
    public $IsValid;
    public function ExecutedCalculation($value)
    {
        $this->IsValid=true;
        $selectedOptions=$this->Field->GetSelectedOptions();
        if(count($selectedOptions)==0)
            return $this->CreateCalculationObject('','',0);

        $this->OptionsTotal=array();

        foreach($selectedOptions as $currentOption)
        {
            $result=null;
            switch ($currentOption->PriceType)
            {
                case 'fixed_amount':
                    $result=(new FixedAmountCalculator($this->Field))
                                ->SetRegularPrice($currentOption->RegularPrice)
                                ->SetSalePrice($currentOption->SalePrice)
                                ->ExecutedCalculation('aa');
                    break;
                case 'percent_or_original_price_plus_options':
                    $result=(new PercentOfOriginalPricePlusOptionsCalculator($this->Field))
                                ->SetRegularPercentage($currentOption->RegularPrice)
                                ->SetSalePercentage($currentOption->SalePrice)
                                ->ExecutedCalculation(' ');
                    break;
                case 'percent_of_original_price':
                    $result=(new PercentOfOriginalPriceCalculator($this->Field))
                                ->SetRegularPercentage($currentOption->RegularPrice)
                                ->SetSalePercentage($currentOption->SalePrice)
                                ->ExecutedCalculation(' ');
                    break;
            }

            if($result==null)
                throw new Exception('Invalid price type '.$currentOption->PriceType);

            $optionsTotal=array(
              'Id'=>$currentOption->Id,
              'SalePrice'=>$result['SalePrice'],
              'RegularPrice'=>$result['RegularPrice'],
              'UnitPrice'=>$result['SalePrice']==''?$result['RegularPrice']:$result['SalePrice'],
              'Quantity'=>$this->GetQuantityInput()
            );

            if($optionsTotal['UnitPrice']=='')
                $optionsTotal['UnitPrice']=0;
            else
                $optionsTotal['UnitPrice']=\floatval($optionsTotal['UnitPrice']);

            $optionsTotal['Price']=$optionsTotal['UnitPrice']*$optionsTotal['Quantity'];

            $this->OptionsTotal[]=$optionsTotal;
            if(\floatval($currentOption->SalePrice)!=\floatval($optionsTotal['SalePrice'])||
                \floatval($currentOption->UnitPrice)!=\floatval($optionsTotal['UnitPrice'])||
                \floatval($currentOption->Price)!=\floatval($optionsTotal['Price'])

            )
                $this->IsValid=false;




        }



        $priceToReturn=$this->CreateCalculationObject(0,0,$this->GetQuantityInput());
        $hasSalePrice=false;
        foreach($this->OptionsTotal as $total)
        {
            if($total['SalePrice']!='')
                $hasSalePrice=true;
        }


        foreach($this->OptionsTotal as $total)
        {
            if($hasSalePrice)
            {
                $priceToReturn['SalePrice']+=\floatval($total['Price']);
                $priceToReturn['RegularPrice']+=\floatval($total['RegularPrice']);
            }else{
                $priceToReturn['SalePrice']=0;
                $priceToReturn['RegularPrice']+=\floatval($total['Price']);
            }
        }




        return $priceToReturn;

    }

    public function GetIsValid()
    {
        return $this->IsValid;
    }


    public function GetDependsOnOtherFields(){
        $selectedOptions=$this->Field->GetSelectedOptions();
        foreach($selectedOptions as $currentOption)
        {
            if($currentOption->PriceType=='percent_or_original_price_plus_options')
                return true;
        }

        return false;
    }


    private function AddOption($original, $ammountToAdd)
    {
        if($ammountToAdd['RegularPrice']!='')
        {
            $original['RegularPrice']=NumericUtilities::ParseNumber($original['RegularPrice'],0)+NumericUtilities::ParseNumber($ammountToAdd['RegularPrice'],0);
        }

        if($ammountToAdd['SalePrice']!='')
        {
            $original['SalePrice']=NumericUtilities::ParseNumber($original['SalePrice'],0)+NumericUtilities::ParseNumber($ammountToAdd['SalePrice'],0);
        }

        return $original;
    }


}