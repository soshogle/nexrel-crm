<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Fields;


use rednaowooextraproduct\Utilities\Sanitizer;

class FBSlider extends FBTextField
{
  public function GetPriceWithoutFormula(){
      return Sanitizer::SanitizeNumber($this->GetEntryValue('Value'));
  }
}