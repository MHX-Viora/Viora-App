Pod::Spec.new do |s|
  s.name = 'MiniAppHost'
  s.version = '0.1.0'
  s.summary = 'Isolated ANKT Mini App trusted-shell view'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'ANKT'
  s.homepage = 'https://ankt.vn'
  s.source = { :path => '.' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
