<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


class CheckboxValueComparator extends ComparatorBase
{

    public function Compare($ComparisonType, $Value)
    {
        $selectedValue=$this->Source->GetValue();
        switch ($ComparisonType)
        {
            case 'IsChecked':
                return $selectedValue==true;
            case 'IsNotChecked':
                return $selectedValue==false;
        }
    }
}