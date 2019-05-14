<?php

declare(strict_types=1);

namespace Nittro\Bridges\NittroLatte;

use Latte\Macros\MacroSet,
    Latte\Compiler,
    Latte\CompileException,
    Latte\MacroNode,
    Latte\PhpWriter;


class NittroMacros extends MacroSet {

    public static function install(Compiler $compiler, bool $noconflict = false) : void
    {
        $me = new static($compiler);
        $prefix = $noconflict ? 'ntr.' : '';

        $me->addMacro($prefix . 'snippetId', NittroRuntime::class . '::deprecated(\'{snippetId}\', \'snippet.id\'); echo %escape($this->global->snippetDriver->getHtmlId(%node.word))');
        $me->addMacro($prefix . 'snippet.id', 'echo %escape($this->global->snippetDriver->getHtmlId(%node.word))');
        $me->addMacro($prefix . 'param', 'echo %escape($this->global->uiControl->getParameterId(%node.word))');
        $me->addMacro($prefix . 'flashes', [$me, 'validateMacro'], [$me, 'macroFlashes'], null, self::AUTO_EMPTY);
        $me->addMacro($prefix . 'flashes.target', null, null, [$me, 'macroFlashTarget']);
        $me->addMacro($prefix . 'flashTarget', null, null, [$me, 'macroFlashTarget']);
        $me->addMacro($prefix . 'dynamic', null, null, [$me, 'macroDynamic']);
        $me->addMacro($prefix . 'errors', [$me, 'validateMacro'], [$me, 'macroErrors'], null, self::AUTO_EMPTY);
        $me->addMacro($prefix . 'errors.form', [$me, 'validateMacro'], [$me, 'macroErrors'], null, self::AUTO_EMPTY);
        $me->addMacro($prefix . 'formErrors', [$me, 'validateMacro'], [$me, 'macroErrors'], null, self::AUTO_EMPTY);
        $me->addMacro($prefix . 'inputId', [$me, 'macroInputId']);
        $me->addMacro($prefix . 'input.id', [$me, 'macroInputId']);
        $me->addMacro($prefix . 'form.id', [$me, 'macroInputId']);
        $me->addMacro($prefix . 'dialog', null, null, [$me, 'macroDialog']);
        $me->addMacro($prefix . 'dialog.form', null, null, [$me, 'macroDialog']);
        $me->addMacro($prefix . 'dialog.iframe', null, null, [$me, 'macroDialog']);
    }


    public function finalize() : array
    {
        return [NittroRuntime::class . '::initialize($this);'];
    }


    public function macroFlashes(MacroNode $node, PhpWriter $writer) : ?string
    {
        $tagName = $node->prefix ? strtolower($node->htmlNode->name) : 'ul';
        $childName = in_array($tagName, ['ul', 'ol'], true) ? 'li' : 'p';
        $classes = 'nittro-flash nittro-flash-inline nittro-flash-%type%';

        $prefix = '$_tmp = Nette\Utils\Html::el(%0.var)->setId($this->global->uiControl->getParameterId(\'flashes\'))->data(\'flash-inline\', true)'
            . ($node->tokenizer->isNext() ? '->addAttributes(%node.array);' : ';')
            . ' foreach($flashes as $_tmp2) $_tmp->create(%1.var)->setClass(str_replace(\'%type%\', $_tmp2->type, %2.var))'
            . ($node->prefix && !empty($node->htmlNode->attrs['data-flash-rich']) ? '->setHtml' : '->setText')
            . '($_tmp2->message)';

        if ($node->prefix) {
            if (!empty($node->htmlNode->attrs['data-flash-classes'])) {
                $classes .= ' ' . $node->htmlNode->attrs['data-flash-classes'];
            }

            $node->openingCode = '<?php ' . $writer->write($prefix, $tagName, $childName, $classes) . ' ?>';
            $node->attrCode = '<?php echo $_tmp->attributes(); ?>';
            $node->innerContent = '<?php echo $_tmp->getHtml() ?>';

            return null;
        } else {
            $node->replaced = true;
            $prefix .= '; echo $_tmp';
            return $writer->write($prefix, $tagName, $childName, $classes);
        }
    }

    public function macroFlashTarget(MacroNode $node, PhpWriter $writer) : void
    {
        if ($node->modifiers) {
            throw new CompileException('Modifiers are not allowed in ' . $node->getNotation());
        } else if ($node->prefix !== MacroNode::PREFIX_NONE) {
            throw new CompileException('Unknown macro ' . $node->getNotation() . ', did you mean n:' . $node->name . '?');
        } else if (!empty($node->htmlNode->attrs['id'])) {
            throw new CompileException('Cannot combine HTML attribute id with ' . $node->getNotation());
        } else if ($node->getNotation() === 'flashTarget') {
            NittroRuntime::deprecated($node->getNotation(), 'flashes.target');
        }

        $attrCode = 'echo \' id="\' . htmlSpecialChars($this->global->uiControl->getParameterId(\'flashes\')) . \'"\'';

        if ($node->tokenizer->isNext()) {
            $attrCode .= '; echo \' data-flash-placement="\' . %node.word . \'"\'';
        }

        $node->attrCode = $writer->write("<?php $attrCode ?>");
    }


    public function macroDynamic(MacroNode $node, PhpWriter $writer) : void
    {
        if (!$node->prefix || $node->prefix !== MacroNode::PREFIX_NONE) {
            throw new CompileException('Unknown macro ' . $node->getNotation() . ', did you mean n:' . $node->name . '?');
        }

        $attrCode = 'echo \' data-dynamic-mask="\' . htmlSpecialChars($this->global->snippetDriver->getHtmlId(%node.word)) . \'"\'';

        if (!empty($node->htmlNode->attrs['class'])) {
            if (!preg_match('/(?:^|\s)nittro-snippet-container(?:\s|$)/', $node->htmlNode->attrs['class'])) {
                throw new CompileException('Dynamic container specifying the "class" attribute must include the "nittro-snippet-container" class');
            }
        } else {
            $attrCode .= ' . \' class="nittro-snippet-container"\'';
        }

        $node->attrCode = $writer->write("<?php $attrCode ?>");
    }

    public function macroErrors(MacroNode $node, PhpWriter $writer) : ?string
    {
        if ($node->getNotation() === 'formErrors') {
            NittroRuntime::deprecated($node->getNotation(), 'errors.form');
        }

        $words = $node->tokenizer->fetchWords();
        $name = array_shift($words);
        $tagName = $node->prefix ? strtolower($node->htmlNode->name) : 'ul';
        $childName = in_array($tagName, ['ul', 'ol'], true) ? 'li' : 'p';

        if ($node->name === 'errors.form' || $node->name === 'formErrors') {
            $prefix = $writer->write(
                '$_tmp = ' . ($name && $name[0] === '$' ? 'is_object(%0.word) ? %0.word : ' : '')
                . ($name ? '$this->global->uiControl[%0.word];' : 'end($this->global->formsStack);')
                . ' $_tmp2 = Nette\Utils\Html::el(%1.var)->setId($_tmp->getElementPrototype()->id . \'-errors\')'
                . ($node->tokenizer->isNext() ? '->addAttributes(%node.array);' : ';')
                . ' foreach($_tmp->getOwnErrors() as $_e) $_tmp2->create(%2.var)->setClass(\'error\')->setText($_e)',
                $name,
                $tagName,
                $childName
            );
        } else {
            if (!$name) {
                throw new CompileException('Missing input name in ' . $node->getNotation());
            }

            $prefix = $writer->write(
                '$_tmp = ' . ($name[0] === '$' ? 'is_object(%0.word) ? %0.word : ' : '')
                . 'end($this->global->formsStack)[%0.word];'
                . ' $_tmp2 = Nette\Utils\Html::el(%2.var)->setId($_tmp->%1.raw . \'-errors\')'
                . ($node->tokenizer->isNext() ? '->addAttributes(%node.array);' : ';')
                . ' foreach($_tmp->getErrors() as $_e) $_tmp2->create(%3.var)->setClass(\'error\')->setText($_e)',
                $name,
                $words ? 'getControlPart(' . implode(', ', array_map([$writer, 'formatWord'], $words)) . ')->getAttribute(\'id\')' : 'getHtmlId()',
                $tagName,
                $childName
            );
        }

        if ($node->prefix) {
            $node->openingCode = '<?php ' . $prefix . ' ?>';
            $node->attrCode = '<?php echo $_tmp2->attributes(); ?>';
            $node->innerContent = '<?php echo $_tmp2->getHtml() ?>';

            return null;
        } else {
            $node->replaced = true;
            return $prefix . '; echo $_tmp2';
        }
    }


    public function macroInputId(MacroNode $node, PhpWriter $writer) : string
    {
        if ($node->getNotation() === 'inputId') {
            NittroRuntime::deprecated($node->getNotation(), 'input.id');
        }

        $words = $node->tokenizer->fetchWords();
        $name = array_shift($words);

        if ($node->name === 'form.id') {
            return $writer->write(
                'echo %escape(%0.raw->getElementPrototype()->id)',
                $name ? $writer->write(
                    '(' . ($name[0] === '$' ? 'is_object(%0.word) ? %0.word : ' : '')
                    . '$this->global->uiControl->getComponent(%0.word))',
                    $name
                ) : 'end($this->global->formsStack)'
            );
        } else if (strpos($name, '-') !== false) {
            $prefix = $writer->write(
                '$this->global->uiControl->getComponent(%0.word)',
                $name
            );
        } else {
            $prefix = $writer->write(
                '(' . ($name[0] === '$' ? 'is_object(%0.word) ? %0.word : ' : '')
                . 'end($this->global->formsStack)[%0.word])',
                $name
            );
        }

        return $writer->write(
            'echo %escape(%0.raw->%1.raw)',
            $prefix,
            $words ? 'getControlPart(' . implode(', ', array_map([$writer, 'formatWord'], $words)) . ')->getAttribute(\'id\')' : 'getHtmlId()'
        );
    }

    public function macroDialog(MacroNode $node, PhpWriter $writer) : void
    {
        if ($node->modifiers) {
            throw new CompileException('Modifiers are not allowed in ' . $node->getNotation());
        } else if ($node->prefix !== MacroNode::PREFIX_NONE) {
            throw new CompileException('Unknown macro ' . $node->getNotation() . ', did you mean n:' . $node->name . '?');
        }

        $type = preg_replace('/^dialog\.?/', '', $node->name) ?: null;
        @list($name, $source) = $node->tokenizer->fetchWords();
        $args = [];

        if (($name === '@current' || $name === '@self') && $source === 'keep') {
            $args[] = "'" . ltrim($name, '@') . "' => true,";
            @list($name, $source) = $node->tokenizer->fetchWords();
        }

        $args[] = $writer->write("\$this->global->nittro->getDialogId(%0.word) => [", $name);

        if ($type) {
            $args[] = $writer->write("'type' => %0.word,", $type);
        }

        if (!$source && $node->name !== 'dialog.iframe') {
            $source = ltrim($name, '@');
        }

        if ($source) {
            $args[] = $writer->write("'source' => \$this->global->snippetDriver->getHtmlId(%0.word),", $source);
        }

        if ($node->tokenizer->isNext()) {
            $args[] = $writer->write("'options' => %node.array,");
        }

        $args[] = ']';

        $node->attrCode = $writer->write(
            ' data-dialog="<?php echo %escape(json_encode([%0.raw])) ?>"',
            implode(' ', $args)
        );
    }


    public function validateMacro(MacroNode $node) : void
    {
        if ($node->modifiers) {
            throw new CompileException('Modifiers are not allowed in ' . $node->getNotation());
        } else if ($node->prefix) {
            if ($node->prefix !== MacroNode::PREFIX_NONE) {
                throw new CompileException('Unknown macro ' . $node->getNotation() . ', did you mean n:' . $node->name . '?');
            } else if ($node->innerContent) {
                throw new CompileException('Unexpected content in ' . $node->getNotation() . ', tag must be empty');
            } else if (isset($node->htmlNode->attrs['id'])) {
                throw new CompileException('Cannot combine HTML attribute id with ' . $node->getNotation());
            }
        }
    }
}
