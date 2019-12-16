<?php

declare(strict_types = 1);

namespace NetteCamp\PHPStan\Reflections;

use Nette\Application\UI\Control;
use PHPStan\Reflection\ClassReflection;
use PHPStan\Reflection\PropertiesClassReflectionExtension;
use PHPStan\Reflection\PropertyReflection;
use function in_array;

final class TemplatePropertyReflectionExtension implements PropertiesClassReflectionExtension
{
	public function hasProperty(ClassReflection $classReflection, string $propertyName): bool
	{
		return $propertyName === 'template' && in_array(Control::class, $classReflection->getParentClassesNames(), true);
	}

	public function getProperty(ClassReflection $classReflection, string $propertyName): PropertyReflection
	{
		return new TemplatePropertyReflection($classReflection);
	}
}
