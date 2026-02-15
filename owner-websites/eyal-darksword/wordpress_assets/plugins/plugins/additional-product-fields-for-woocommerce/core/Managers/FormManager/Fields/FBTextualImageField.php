<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;


class FBTextualImageField extends FBFieldBase
{
    public $optionsToReturn=null;
    public function GetSelectedOptions(){
        if($this->optionsToReturn==null)
        {
            $this->optionsToReturn=array();
            if(isset($this->Entry)&&isset($this->Entry->Value)&&isset($this->Options->Texts))
            {
                foreach($this->Entry->Value->Texts as $selectedEntry)
                {
                    foreach($this->Options->Texts as $selectedOption)
                    {
                        if($selectedOption->Id==$selectedEntry->Id)
                        {
                            $this->optionsToReturn[] = (object)\array_merge((array)$selectedEntry,(array)$selectedOption);
                        }
                    }
                }
            }

        }
        return $this->optionsToReturn;
    }

    public function GetLineItems(){
        $options=$this->GetSelectedOptions();

        $this->Entry->Value->Texts=$options;
        return array((object)\array_merge((array)$this->Entry,array(
            'Id'=>$this->Options->Id,
            'FieldName'=>$this->Options->FieldName,
            'Type'=>$this->Options->Type
        )));
    }

    public function GetValue(){
        return $this->GetSelectedOptions();
    }
}