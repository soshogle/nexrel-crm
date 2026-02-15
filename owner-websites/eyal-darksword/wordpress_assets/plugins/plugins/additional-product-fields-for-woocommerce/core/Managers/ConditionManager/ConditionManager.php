<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager;


use rednaowooextraproduct\core\Managers\ConditionManager\Comparator\ComparatorFactory;
use rednaowooextraproduct\core\Managers\ConditionManager\Comparator\MultipleValueComparator;
use rednaowooextraproduct\core\Managers\ConditionManager\Comparator\VariationSource;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;

class ConditionManager
{
    /**
     * @param $model FormBuilder
     * @param $condition
     * @return bool
     */
    public function ShouldProcess($model,$condition)
    {
        if($condition==null)
            return true;

        foreach($condition->ConditionGroups as $group)
        {
            $groupIsValid=true;
            foreach($group->ConditionLines as $line)
            {
                if(!$groupIsValid)
                    break;

                switch($line->Type)
                {
                    case 'Standard':
                        $field=$model->ContainerManager->GetFieldById($line->FieldId,false,true);
                        if($field==null)
                            break;

                        $comparator=ComparatorFactory::GetComparator($model,$field);
                        $groupIsValid=$comparator->Compare($line->Comparison,$line->Value);

                        break;
                    case 'Variation':
                        $comparator=new MultipleValueComparator($model,new VariationSource($model,$line->FieldId));
                        $groupIsValid=$comparator->Compare($line->Comparison,$line->Value);
                        break;


                }
            }

            if($groupIsValid)
                return true;

        }

        return false;

    }
}